/**
 * Author: wysaid
 * Date: 2022-1-25
 */

import vscode = require('vscode');
import childProcess = require('child_process')
import { EGEInstaller } from './installer';
import path = require('path');
import iconv = require('iconv-lite')
import fs = require('fs-extra');
import { SingleFileBuilder, getCppShowConsoleDefine } from './SingleFileBuilder';
import { ege } from './ege';
import { asyncRunShellCommand } from './utils';
import { CompilerItem } from './compilers';

/// 编译单个文件

export class SingleFileBuilderWin32 extends SingleFileBuilder {

    buildSuccessAtLeaseOnce = false;
    runFileTerminal: vscode.Terminal | undefined;

    constructor() {
        super();
    }

    async buildCurrentActiveFile(fileToRun: string): Promise<void> {
        const activeFile = fileToRun || vscode.window.activeTextEditor?.document?.fileName;
        if (activeFile) {
            const egeInstaller = EGEInstaller.instance();
            const comp = egeInstaller.getCompilerHandle();

            if (!comp.selectedCompiler) {
                ege.printInfo("正在查找可用编译器...");
                const c = await comp.chooseCompilerByUser();
                comp.setCompiler(c);
                /// eslint 会在非 windows 系统里面判定 comp.selectedCompiler 永远为 null, 所以这里使用 as any.
                const compilerItem: CompilerItem = comp.selectedCompiler as any;
                if (compilerItem) {
                    ege.printInfo("选择编译器 " + compilerItem.path);
                    ege.printInfo("正在编译...", false);
                    await this.buildCurrentActiveFile(activeFile);
                }
            } else {
                const compilerItem = comp.selectedCompiler;
                if (compilerItem.path) {
                    /// 当前仅支持 visual studio.
                    await this.performBuildWithVisualStudio(activeFile, compilerItem);
                }
            }
        } else {
            ege.printError("未找到代码文件!");
        }
    }

    async performBuildWithVisualStudio(filePath: string, compilerItem: EGEInstaller.CompilerItem) {

        ege.printInfo(`EGE: Performing build with Visual Studio "${compilerItem.path}", file: "${filePath}"`);
        const cmdTool = compilerItem.getBuildCommandTool();
        const installerDir = EGEInstaller.instance()?.egeInstallerDir;
        let extraIncludeDir = null;
        let extraLibsDir: string | null = null;

        let cppStandard = 'c++11';
        if (compilerItem.version >= 2019) {
            /// vs2019, vs2022
            cppStandard = 'c++17';
        } else if (compilerItem.version >= 2015) {
            cppStandard = 'c++14';
        }

        if (compilerItem.version > 0) {
            extraIncludeDir = path.join(installerDir, 'include');
            const libDir = path.join(installerDir, 'lib');
            extraLibsDir = path.join(libDir, `vs${compilerItem.version}`);
            if (!fs.existsSync(extraLibsDir)) {
                console.log(`EGE: path "${extraLibsDir}" does not exist, set to default`);
                extraLibsDir = path.join(libDir, 'vs2019'); // 目前最新是这个.
            }
        }

        const arch = 'x86'; // Use x86 default to achieve the best compatible.
        const pathParsed = path.parse(filePath);
        const fileDir = pathParsed.dir;
        const exeName = pathParsed.dir + '/' + pathParsed.name + '.exe';
        const extraIncludeCommand = (extraIncludeDir && fs.existsSync(extraIncludeDir)) ? `/I "${extraIncludeDir}"` : '';
        let extraLibsCommand = '';

        if (extraLibsDir && fs.existsSync(extraLibsDir)) {
            extraLibsCommand = `/LIBPATH:"${extraLibsDir}"`;
            const subDirs = ['x86', 'x64', 'amd64'];
            subDirs.forEach(s => {
                const newDir = path.join(extraLibsDir as string, s);
                if (fs.existsSync(newDir)) {
                    extraLibsCommand += ` /LIBPATH:"${path.join(extraLibsDir as string, s)}"`;
                }
            });
        }

        let defineConsole = getCppShowConsoleDefine(filePath) ?? "";
        if (defineConsole.length > 0) {
            defineConsole = `/D${defineConsole}`;
        }
        const buildCommand = `call "${cmdTool}" ${arch} && cl /nodefaultlib:"MSVCRT" /MDd ${defineConsole} ${extraIncludeCommand} /std:${cppStandard} /EHsc "${filePath}" /link ${extraLibsCommand}`;

        const logMsg = `执行编译指令: ${buildCommand}`;
        ege.printWarning(logMsg);

        const result = await asyncRunShellCommand(buildCommand, null, {
            cwd: fileDir,
            printMsg: 'gbk',
            useWindowsConsole: true
        });

        if (result?.exitCode !== 0) {
            ege.showErrorBox("编译失败!");

            if (!this.buildSuccessAtLeaseOnce) {
                /// 如果从未成功过, 那么每次都要重新选一下编译器.
                EGEInstaller.instance()?.getCompilerHandle()?.setCompiler(undefined);
            }
        } else {
            ege.printInfo("编译结束!");
            this.buildSuccessAtLeaseOnce = true;

            ege.printInfo("可执行文件: " + exeName);
            /// 使用 vscode 自带的 terminal 来执行.


            /// dispose right now.                
            if (this.runFileTerminal && this.runFileTerminal.exitStatus === undefined) {
                this.runFileTerminal.dispose();
            }

            const exeBaseNameNoSuffix = path.basename(filePath, path.extname(filePath));
            const exeBaseName = exeBaseNameNoSuffix + ".exe";
            this.runFileTerminal = vscode.window.createTerminal({
                name: exeBaseNameNoSuffix,
                cwd: path.dirname(filePath),
                shellPath: 'cmd.exe',
                shellArgs: ['/k', exeBaseName],
            });
            this.runFileTerminal.show();
        }
        ege.showOutputChannel(false);
    }

    release() {
    }
}