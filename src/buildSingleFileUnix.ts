/**
 * @author: wysaid
 * Date: 20231210
 */

import { SingleFileBuilder } from "./SingleFileBuilder";
import { ege } from "./ege";
import { asyncRunShellCommand, isDebian, isMacOS, whereis } from "./utils";
import * as vscode from 'vscode';
import * as fs from 'fs-extra';
import path from "path";
import { EGEInstaller } from "./installer";

export class SingleFileBuilderUnix extends SingleFileBuilder {

    /// 由于 ege 并不支持非 windows 系统, 所以这里使用 mingw-w64 来实现.
    static readonly mingw64Compiler = "x86_64-w64-mingw32-g++";

    osLibDir: string | undefined;
    checkEnv = true;
    runFileTerminal: vscode.Terminal | undefined;

    constructor() {
        super();
        if (isMacOS()) {
            this.osLibDir = "macOS";
        } else if (isDebian()) {
            this.osLibDir = "mingw-w64-debian";
        } else {
            this.osLibDir = ""; /// @TODO: linux
        }
    }

    buildCommand(args: string[]) {
        const argStr = args.length > 1 ? args.map(arg => `"${arg}"`).join(" ").trim() : args[0].trim();
        return `${SingleFileBuilderUnix.mingw64Compiler} -D_FORTIFY_SOURCE=0 ${argStr} -lgraphics64 -lgdiplus -lgdi32 -limm32 -lmsimg32 -lole32 -loleaut32 -lwinmm -luuid -mwindows -static -I"${EGEInstaller.instance().egeInstallerDir}/include" -L"${EGEInstaller.instance().egeInstallerDir}/lib/${this.osLibDir}" -o ${path.basename(argStr, path.extname(argStr))}.exe`;
    }

    async buildCurrentActiveFile(fileToRun: string): Promise<void> {
        if (this.checkEnv) { /// 检查一下 mingw-w64 是否安装
            const mingw64 = whereis(SingleFileBuilderUnix.mingw64Compiler);
            if (mingw64) {
                this.checkEnv = false;
            } else {
                ege.showErrorBox(`未找到 ${SingleFileBuilderUnix.mingw64Compiler}! 请先安装 'mingw-w64'!`, "OK");
                ege.printError(`请参考安装说明: <https://github.com/wysaid/xege/blob/master/BUILD.md>`);
                if (isMacOS()) {
                    ege.printError(`在 macOS 上, 考虑使用 homebrew 来安装: 'brew install mingw-w64'`);
                }
                return;
            }
        }

        ege.printInfo("正在编译...", false);
        const activeFile = fileToRun || vscode.window.activeTextEditor?.document?.fileName;
        if (!activeFile || !fs.existsSync(activeFile)) {
            ege.showErrorBox(`${activeFile ? activeFile + " 不是一个正确的代码文件" : "未找到可编译的文件!"}`, "OK");
            return;
        }

        const cwd = path.dirname(activeFile);
        const cmd = this.buildCommand([activeFile]);
        ege.printInfo(`执行指令 ${cmd}`);
        const ret = await asyncRunShellCommand(cmd, null, {
            cwd: cwd,
            printMsg: true
        });

        if (ret?.exitCode !== 0) {
            ege.showErrorBox("编译失败!", "OK");
            return;
        } else {
            /// 编译成功了, 运行一下.
            const exeNameNoSuffix = path.basename(activeFile, path.extname(activeFile));
            const exeName = exeNameNoSuffix + ".exe";
            if (this.runFileTerminal && this.runFileTerminal.exitStatus === undefined) {
                this.runFileTerminal.dispose();
            }

            const winePath = whereis("wine64");
            if (winePath) {
                this.runFileTerminal = vscode.window.createTerminal({
                    name: exeNameNoSuffix,
                    cwd: cwd
                });
                this.runFileTerminal.show();
                this.runFileTerminal.sendText(`wine64 ${exeName}`);
            } else {
                ege.showErrorBox("未找到 wine64! 请先安装 'wine64' !", "OK");
                if (isMacOS()) {
                    ege.printError(`在 macOS 上, 你可以通过 homebrew 来安装, 执行代码: 'brew install wine-stable'`);
                } else if (isDebian()) {
                    ege.printError(`在 Debian/Ubuntu 上, 你可以通过 apt 来安装, 执行代码: 'sudo apt install wine64'`);
                }
            }
        }
    }

    release(): void {
    }

}