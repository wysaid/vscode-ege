/**
 * Author: wysaid
 * Date: 2022-1-23
 */

import cp = require('child_process');
import os = require('os');
import vscode = require('vscode');
import fs = require('fs-extra');
import path = require('path');
import { ege } from './ege';
import iconv = require('iconv-lite')

const libsDirArray = [
    'graphics.lib',
    'amd64/graphics.lib',
    'amd64/graphics64.lib',
    'x86/graphics.lib',
    'x64/graphics64.lib',
];

export function openDirectoryInFileExplorer(dir: string) {
    const osName = os.platform();
    let openExplorerCommand = null;
    if (osName === 'win32' || osName === 'cygwin') { /// win
        openExplorerCommand = `explorer.exe "${dir}"`;
    } else if (osName === 'darwin') { /// mac
        openExplorerCommand = `open "${dir}"`;
    } else if (osName === 'linux') {
        openExplorerCommand = `xdg-open "${dir}"`;
    } else {
        vscode.window.showErrorMessage(`EGE: Open dir is not supported on ${dir}`);
    }

    if (openExplorerCommand) {
        cp.exec(openExplorerCommand, (err) => {
            if (err)
                vscode.window.showInformationMessage(`EGE: Open dir ${dir} failed: ${err}`)
        });
    }
}

export function validateInstallationOfDirectory(dir: string): boolean {

    /// Check `graphics.h`
    const graphicsHeaderPath = path.join(dir, 'include/graphics.h');
    const egeHeaderPath = path.join(dir, 'include/ege.h');

    if (fs.existsSync(graphicsHeaderPath) && fs.existsSync(egeHeaderPath)) {
        console.log("EGE: Find " + graphicsHeaderPath);
        console.log("EGE: Find " + egeHeaderPath);
    } else {
        console.error("EGE: No header at dir: " + dir);
        return false;
    }

    let findedLibs = new Array();

    libsDirArray.forEach(name => {
        let sdkLibDir = path.join(dir, 'lib');
        if (sdkLibDir.indexOf('wysaid.ege') !== -1 && sdkLibDir.indexOf('Install') !== -1) {
            /// The plugin temp directory, choose vs2019 to test.
            sdkLibDir = path.join(sdkLibDir, 'vs2019');
        }
        const libPath = path.join(sdkLibDir, name);
        if (fs.existsSync(libPath)) {
            findedLibs.push(libPath);
        }
    });

    if (findedLibs.length !== 0) {
        findedLibs.forEach(f => {
            console.log("EGE: Find lib file at: " + f);
        });
        return true;
    } else {
        console.error("EGE: EGE libraries not found at: " + dir);
        return false;
    }
}

export function isWindows(): boolean {
    return os.platform() === "win32";
}

export function isMacOS(): boolean {
    return os.platform() === "darwin";
}

export function whereis(name: string): string | null {
    try {
        const ret = cp.execSync((os.platform() === "win32" ? "where " : "which ") + name).toString();
        if (ret && ret.length > 0) {
            if (isWindows()) {
                return ret.split('\r\n')[0];
            }
            return ret;
        }
    } catch (e) {
        console.log(e);
    }
    return null;
}

let supportWSL: number = -1;
export function hasWslSupport(): boolean {
    if (supportWSL < 0 && !isMacOS()) {
        /// 检查一下
        supportWSL = whereis("wsl.exe") ? 1 : 0;
    }
    return supportWSL === 1;
}

export type ShellResult = {
    exitCode: number;
    stdout: string | Buffer;
    stderr: string | Buffer;
};

export type RunShellOption = {
    cwd?: string | null;
    forceWsl?: boolean;
    useBuffer?: boolean;
    noErrorMsg?: boolean;
    useWindowsConsole?: boolean;
    useWindowsPowerShell?: boolean;
    /// 如果 `{!!printMsg}` 为 true, 则不会返回 stdout, stderr
    /// 如果 printMsg 为 'GBK', 表示在 windows 下强制使用 GBK 编码输出
    printMsg?: boolean | 'gbk';
    detach?: boolean;
};

type ShellRunnerInfo = {
    command: string;
    args?: string[];
    options: cp.SpawnSyncOptions | cp.CommonSpawnOptions;
};

function createShellRunnerInfo(command: string, args?: string[] | null, shellOption?: RunShellOption): null | ShellRunnerInfo | undefined {
    let result: ShellRunnerInfo | undefined;

    if (os.platform() === "darwin" || os.platform() === "linux" ||
        (os.platform() === "win32" && (hasWslSupport() || hasBashSupport))) {

        let shellCommand: string;

        if (isWindows() && (shellOption?.useWindowsConsole || shellOption?.useWindowsPowerShell)) {
            shellCommand = shellOption.useWindowsPowerShell ? "powershell" : "cmd";
        } else {
            if (hasBashSupport() && !(shellOption && shellOption.forceWsl)) {
                // windows 下优先找一下 git bash
                shellCommand = gitBashPath as string;
            } else if (hasWslSupport()) {
                shellCommand = 'wsl';
            } else {
                shellCommand = 'bash';
            }
        }

        let options: cp.SpawnSyncOptions = {
            encoding: shellOption?.useBuffer ? 'buffer' : 'utf8',
            shell: shellCommand
        };

        if (shellOption?.cwd) {
            options.cwd = shellOption.cwd;
        }

        if (shellOption?.detach) {
            const sp = cp.spawn(command, args as string[], {
                detached: true,
                shell: shellCommand,
                cwd: shellOption?.cwd as string
            });
            sp.unref();
            return null;
        }

        result = {
            command: command,
            args: args || undefined,
            options: options
        };

    } else {
        ege.showErrorBox("Unsupported platform!");
    }

    return result;
}

let supportGitBash: number = -1;
let gitBashPath: string | null = null;

// 仅支持windows, 找一下 git bash / mingw
export function hasBashSupport(): boolean {
    if (supportGitBash < 0 && isWindows()) {
        /// 检查一下
        try {
            const bashPaths = whereis("bash.exe") as string;
            gitBashPath = bashPaths?.split('\n')?.filter((v) => {
                return !(v.indexOf("System32") >= 0 || v.indexOf("Microsoft\\WindowsApps") >= 0);
            })?.[0]?.trim();

            if (!gitBashPath) {
                const gitPaths = whereis("git.exe") as string;
                let gitPath = gitPaths.split('\n')[0];
                gitPath = gitPath.trim();
                const gitDir = path.dirname(gitPath);

                /// 直接遍历 gitDir 往上找，一直到路径不包含 git 字样 位置.
                let gitInstallDir = gitDir;
                while (gitInstallDir.indexOf("Git") >= 0) {
                    const guessSuffix = ["bash.exe", "bin/bash.exe", "usr/bin/bash.exe", "mingw64/bin/bash.exe", "mingw32/bin/bash"];

                    for (const suffix of guessSuffix) {
                        let guessGitBashPath = path.join(gitInstallDir, suffix);

                        if (fs.existsSync(guessGitBashPath)) {
                            gitBashPath = guessGitBashPath;
                            break;
                        }
                    }

                    if (gitBashPath) {
                        break;
                    }
                    gitInstallDir = path.dirname(gitInstallDir);
                }
            }

            console.log("Bash find at " + gitBashPath);
            if (fs.existsSync(gitBashPath)) {
                supportGitBash = 1;
            } else {
                supportGitBash = 0;
            }
        } catch (e) {
            // 没有 wsl
            supportGitBash = 0;
        }
    }
    return supportGitBash === 1;
}

export function convertWindowsPathForShell(path: string, type?: "git-bash" | "wsl"): string {
    // 先把 \ 转为 /
    if (isWindows()) {
        path = path.replaceAll('\\', '/');
        if (!type) {
            if (hasBashSupport()) {
                type = "git-bash";
            } else if (hasWslSupport()) {
                type = "wsl";
            }
        }

        if (type === "git-bash") {
            path = path.replaceAll(/(\w):\/?/ig, "/$1/");
        } else if (type === "wsl") {
            path = path.replaceAll(/(\w):\/?/ig, "/mnt/$1/");
        }
    }
    return path;
}

function shouldConvertToGBK(shellOption?: RunShellOption): boolean {
    return shellOption?.printMsg === 'gbk' && isWindows();
}

export function runShellCommand(command: string, args?: string[] | null, shellOption?: RunShellOption): null | ShellResult {
    let result: ShellResult | null = null;

    try {
        const runInfo = createShellRunnerInfo(command, args, shellOption) as ShellRunnerInfo;

        if (!runInfo) {
            return null;
        }

        const sp = cp.spawnSync(runInfo.command, runInfo.args, runInfo.options);

        if (sp.error && !shellOption?.noErrorMsg) {
            console.error(`runShellCommand - ${sp.error} - ${arguments.toString()} - ${shellOption?.cwd}`);
        }

        if (shellOption?.printMsg) {
            if (sp.stdout && !shellOption.useBuffer) {
                if (shouldConvertToGBK(shellOption)) {
                    ege.printInfo(iconv.decode(sp.stdout as Buffer, 'gbk'));
                } else {
                    ege.printInfo(sp.stdout as string);
                }
            }
            if (sp.stderr) {
                if (shouldConvertToGBK(shellOption)) {
                    ege.printError(iconv.decode(sp.stderr as Buffer, 'gbk'));
                } else {
                    ege.printError(sp.stderr as string);
                }
            }
        }

        result = {
            stdout: sp.stdout,
            stderr: sp.stderr,
            exitCode: sp.status as number
        };
    } catch (e) {
        if (shellOption?.noErrorMsg) {
            console.log(arguments);
            console.error(`runShellCommand failed: ${e}`);
        }
    }

    return result;
}

export function asyncRunShellCommand(command: string, args?: string[] | null, shellOption?: RunShellOption): Promise<null | ShellResult> {
    return new Promise<null | ShellResult>((async (resolve) => {
        if (shellOption?.detach) {
            const ret = runShellCommand(command, args, shellOption);
            resolve(ret);
            return;
        }

        const runInfo = createShellRunnerInfo(command, args, shellOption) as ShellRunnerInfo;

        if (!runInfo) {
            resolve(null);
            return;
        }

        const sp = runInfo.args ? cp.spawn(runInfo.command, runInfo.args, runInfo.options) : cp.spawn(runInfo.command, runInfo.options);

        let stdout = "";
        let stderr = "";

        sp.stdout?.on('data', (data) => {
            if (shellOption?.printMsg) {
                if (shouldConvertToGBK(shellOption)) {
                    ege.printInfo(iconv.decode(data as Buffer, 'gbk'));
                } else {
                    ege.printInfo(data.toString());
                }
            } else {
                stdout += data.toString();
            }
        });

        sp.stderr?.on('data', (data) => {
            if (shellOption?.printMsg) {
                if (shouldConvertToGBK(shellOption)) {
                    ege.printError(iconv.decode(data as Buffer, 'gbk'));
                } else {
                    ege.printError(data.toString());
                }
            }
            stderr += data.toString();
        });

        sp.on('close', (code) => {
            resolve({
                stdout: stdout,
                stderr: stderr,
                exitCode: code as number
            });
        });

        sp.on('error', (err) => {
            ege.printError(`asyncRunShellCommand - ${err} - ${arguments.toString()} - ${shellOption?.cwd}`);
            resolve(null);
        });

        if (shellOption?.printMsg) {
            ege.printInfo(`执行命令: ${command} ${args ? args.join(' ') : ''}`);
        }
    }));
}

