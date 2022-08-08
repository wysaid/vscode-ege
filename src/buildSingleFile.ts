/**
 * Author: wysaid
 * Date: 2022-1-25
 */

import vscode = require('vscode');
import childProcess = require('child_process')
import { EGE } from './ege';
import path = require('path');
import iconv = require('iconv-lite')
import fs = require('fs-extra');

/// 编译单个文件

class SingleFileBuilder {

    /**
     * @type {vscode.FileSystemWatcher}
     */
    fileWatcher = null;

    /**
     * @type {string[]}
     */
    buildFiles = null;

    buildSuccessAtLeaseOnce = false;

    constructor() {
        this.fileWatcher = vscode.workspace.createFileSystemWatcher("**/*.+(cpp|h|cc|c)", true, false, true);

        this.buildFiles = [];
        this.fileWatcher.onDidChange(uri => {
            const fsPath = uri.fsPath;
            console.log(`EGE: file change detected: ${fsPath}`);
            const index = this.buildFiles.indexOf(fsPath);
            if (index >= 0) {
                this.buildFiles.splice(index, 1);
            }
        });
    }

    buildCurrentActiveFile(fileToRun) {
        const activeFile = fileToRun || vscode.window.activeTextEditor?.document?.fileName;
        if (activeFile) {

            /**
             * @type {EGE}
             */
            const ege = EGE.instance();
            const comp = ege.getCompilerHandle();

            if (!comp.selectedCompiler) {
                if (!this.outputChannel) {
                    this.outputChannel = vscode.window.createOutputChannel('EGE');
                }

                this.outputChannel.appendLine("EGE: Looking for compiler...");

                comp.chooseCompilerByUser()?.then(c => {
                    comp.setCompiler(c);
                    if (comp.selectedCompiler) {
                        this.outputChannel.appendLine("EGE: Choosed compiler " + comp.selectedCompiler.path);
                        this.outputChannel.appendLine("EGE: Performing build...");
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

    /**
     * 
     * @param {string} filePath 
     * @param {EGE.CompilerItem} compilerItem
     */
    performBuildWithVisualStudio(filePath, compilerItem) {
        if (!this.outputChannel) {
            this.outputChannel = vscode.window.createOutputChannel('EGE');
        }
        const outputChannel = this.outputChannel;

        outputChannel.appendLine(`EGE: Performing build with Visual Studio "${compilerItem.path}", file: "${filePath}"`);
        const cmdTool = compilerItem.getBuildCommandTool();
        const installerDir = EGE.instance()?.egeInstallerDir;
        let extraIncludeDir = null;
        let extraLibsDir = null;

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
                const newDir = path.join(extraLibsDir, s);
                if (fs.existsSync(newDir)) {
                    extraLibsCommand += ` /LIBPATH:"${path.join(extraLibsDir, s)}"`;
                }
            });
        }

        const buildCommand = `call "${cmdTool}" ${arch} && cl /nodefaultlib:"MSVCRT" /MDd ${extraIncludeCommand} /std:${cppStandard} /EHsc "${filePath}" /link ${extraLibsCommand}`;

        const logMsg = `EGE: Perform build with command: ${buildCommand}`;
        outputChannel.appendLine(logMsg);
        outputChannel.show();

        const proc = childProcess.exec(buildCommand, {
            encoding: 'buffer',
            cwd: fileDir
        }, (error, outMsg, errMsg) => {
            if (error) {
                console.log(error.cmd);
                outputChannel.appendLine(error.cmd);
            }

            const msg = outMsg || errMsg;

            if (msg) {
                /// 转码一下, 避免乱码
                const gbkResult = iconv.decode(msg, 'gbk');
                outputChannel.appendLine(gbkResult);
            }
        });

        proc.on('close', (exitCode) => {
            if (exitCode !== 0) {
                vscode.window.showErrorMessage("EGE: Build Failed!");

                if (!this.buildSuccessAtLeaseOnce) {
                    /// 如果从未成功过, 那么每次都要重新选一下编译器.
                    EGE.instance()?.getCompilerHandle()?.setCompiler(null);
                }
            } else {
                vscode.window.showInformationMessage("EGE: Finish building!");
                this.buildSuccessAtLeaseOnce = true;

                outputChannel.appendLine("Running " + exeName);
                setTimeout(() => {
                    /// dispose right now.
                    const folderName = path.dirname(exeName);
                    childProcess.exec(`cd ${folderName} && start ${exeName}`);
                }, 500);
            }
            outputChannel.show();

            // /// 5秒后关闭
            // setTimeout(() => {
            //     outputChannel.dispose();
            //     this.outputChannel = null;
            // }, 5000);

        });
    }

    release() {
        if (this.fileWatcher) {
            this.fileWatcher.dispose();
            this.fileWatcher = null;
        }
    }
}

/**
 * @type {SingleFileBuilder}
 */
global.egeBuilderInstance = null;

SingleFileBuilder.instance = function () {
    if (!global.egeBuilderInstance) {
        global.egeBuilderInstance = new SingleFileBuilder();
    }
    return global.egeBuilderInstance;
}

SingleFileBuilder.unregister = function () {
    if (global.egeBuilderInstance) {
        global.egeBuilderInstance.release();
        global.egeBuilderInstance = null;
    }
}

module.exports = SingleFileBuilder;