// @ts-nocheck
/**
 * Author: wysaid
 * Date: 2022-1-25
 */
'use strict';

const vscode = require('vscode');
const childProcess = require('child_process')
const EGE = require('./EGE');

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

    buildCurrentActiveFile() {
        const activeFile = vscode.window.activeTextEditor?.document?.fileName;
        if (activeFile) {

            /**
             * @type {EGE}
             */
            const ege = EGE.instance();
            const comp = ege.getCompilerHandle();

            if (!comp.selectedCompiler) {
                comp.chooseCompilerByUser()?.then(c => {
                    comp.setCompiler(c);
                    if (comp.selectedCompiler)
                        this.buildCurrentActiveFile();
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
        console.log(`EGE: Performing build with Visual Studio "${compilerItem.path}", file: "${filePath}"`);
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