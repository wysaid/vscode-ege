/**
 * @author: wysaid
 * Date: 20231210
 */

import { SingleFileBuilder } from "./SingleFileBuilder";
import { ege } from "./ege";
import { whereis } from "./utils";
import * as vscode from 'vscode';

export class SingleFileBuilderUnix extends SingleFileBuilder {

    /// 由于 ege 并不支持非 windows 系统, 所以这里使用 mingw-w64 来实现.
    static readonly mingw64Compiler = "x86_64-w64-mingw32-g++";
    checkEnv = true;

    constructor() {
        super();
    }

    buildCommand(args: string[]) {
        const argStr = args.map(arg => `"${arg}"`).join(" ");
        return `${SingleFileBuilderUnix.mingw64Compiler} -D_FORTIFY_SOURCE=0 ${argStr} -lgraphics64 -lgdiplus -lgdi32 -limm32 -lmsimg32 -lole32 -loleaut32 -lwinmm -luuid -mwindows -static`;
    }

    async buildCurrentActiveFile(fileToRun: string): Promise<void> {
        if (this.checkEnv) { /// 检查一下 mingw-w64 是否安装
            const mingw64 = whereis(SingleFileBuilderUnix.mingw64Compiler);
            if (mingw64) {
                this.checkEnv = false;
            } else {
                ege.showErrorBox(`[ege]: ${SingleFileBuilderUnix.mingw64Compiler} not found! Please install 'mingw-w64' first!`);
                ege.printError(`Please see the install guide: <>`);
                return;
            }
        }

        vscode.window.showInformationMessage("[ege]: Building...");
        const activeFile = fileToRun || vscode.window.activeTextEditor?.document?.fileName;
        if (!activeFile) {
            ege.showErrorBox("[ege]: No active file!");
            return;
        }
    }

    release(): void {
    }

}