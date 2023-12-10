/**
 * @author: wysaid
 * Date: 20231210
 */

import { SingleFileBuilder } from "./SingleFileBuilder";
import { ege } from "./ege";
import { asyncRunShellCommand, isMacOS, whereis } from "./utils";
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
                ege.showErrorBox(`[ege]: ${SingleFileBuilderUnix.mingw64Compiler} not found! Please install 'mingw-w64' first!`);
                ege.printError(`Please see the install guide: <https://github.com/wysaid/xege>`);
                if (isMacOS()) {
                    ege.printError(`On macOS, you can install it with homebrew: brew install mingw-w64`);
                }
                return;
            }
        }

        vscode.window.showInformationMessage("[ege]: Building...");
        const activeFile = fileToRun || vscode.window.activeTextEditor?.document?.fileName;
        if (!activeFile || !fs.existsSync(activeFile)) {
            ege.showErrorBox("[ege]: No active file!");
            return;
        }

        const cwd = path.dirname(activeFile);
        const cmd = this.buildCommand([activeFile]);
        ege.printInfo(`[ege]: ${cmd}`);
        const ret = await asyncRunShellCommand(cmd, null, {
            cwd: cwd,
            printMsg: true
        });

        if (ret?.exitCode !== 0) {
            ege.showErrorBox("[ege]: Build failed!");
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
                ege.showErrorBox("[ege]: wine64 not found! Please install 'wine64' command first!");
                if (isMacOS()) {
                    ege.printError(`On macOS, you can install it with homebrew: brew install wine-stable`);
                }
            }
        }
    }

    release(): void {
    }

}