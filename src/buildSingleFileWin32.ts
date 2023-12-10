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
import { SingleFileBuilder } from './buildSingleFile';
import { ege } from './ege';

/// 编译单个文件

export class SingleFileBuilderWin32 extends SingleFileBuilder {

    buildSuccessAtLeaseOnce = false;

    constructor() {
        super();
    }

    buildCurrentActiveFile(fileToRun: string) {
        const activeFile = fileToRun || vscode.window.activeTextEditor?.document?.fileName;
        if (activeFile) {
            const egeInstaller = EGEInstaller.instance();
            const comp = egeInstaller.getCompilerHandle();

            if (!comp.selectedCompiler) {


                ege.printInfo("EGE: Looking for compiler...");

                comp.chooseCompilerByUser()?.then(c => {
                    comp.setCompiler(c);
                    if (comp.selectedCompiler) {
                        ege.printInfo("EGE: Choosed compiler " + comp.selectedCompiler.path);
                        ege.printInfo("EGE: Performing build...");
                        setTimeout(() => {
                            this.buildCurrentActiveFile(activeFile);
                        }, 100);
                    }
                });
            } else {
                const compilerItem = comp.selectedCompiler;
                if (compilerItem.path) {
                    /// 当前仅支持 visual studio.
                    this.performBuildWithVisualStudio(activeFile, compilerItem);
                }
            }

        } else {
            vscode.window.showErrorMessage("EGE: No active file!");
        }
    }

    performBuildWithVisualStudio(filePath: string, compilerItem: EGEInstaller.CompilerItem): void {

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

        const buildCommand = `call "${cmdTool}" ${arch} && cl /nodefaultlib:"MSVCRT" /MDd ${extraIncludeCommand} /std:${cppStandard} /EHsc "${filePath}" /link ${extraLibsCommand}`;

        const logMsg = `EGE: Perform build with command: ${buildCommand}`;
        ege.printWarning(logMsg);

        const proc = childProcess.exec(buildCommand, {
            encoding: 'buffer',
            cwd: fileDir
        }, (error, outMsg, errMsg) => {
            if (error) {
                console.log(error.cmd);
                ege.printInfo(error.cmd as string);
            }

            const msg = outMsg || errMsg;

            if (msg) {
                /// 转码一下, 避免乱码
                const gbkResult = iconv.decode(msg, 'gbk');
                ege.printInfo(gbkResult);
            }
        });

        proc.on('close', (exitCode) => {
            if (exitCode !== 0) {
                vscode.window.showErrorMessage("EGE: Build Failed!");

                if (!this.buildSuccessAtLeaseOnce) {
                    /// 如果从未成功过, 那么每次都要重新选一下编译器.
                    EGEInstaller.instance()?.getCompilerHandle()?.setCompiler(undefined);
                }
            } else {
                vscode.window.showInformationMessage("EGE: Finish building!");
                this.buildSuccessAtLeaseOnce = true;

                ege.printInfo("Running " + exeName);
                setTimeout(() => {
                    /// dispose right now.
                    const folderName = path.dirname(exeName);
                    childProcess.exec(`cd ${folderName} && start cmd /C "${exeName}"`);
                }, 500);
            }
            ege.showOutputChannel(false);

            // /// 5秒后关闭
            // setTimeout(() => {
            //     outputChannel.dispose();
            //     this.outputChannel = null;
            // }, 5000);

        });
    }

    release() {
    }
}