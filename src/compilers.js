// @ts-nocheck
/**
 * Author: wysaid
 * Date: 2022-1-23
 */
'use strict';

/// hard code to detect compilers

const vscode = require('vscode');
const childProcess = require('child_process');
const os = require('os');
const fs = require('fs-extra');

class Compilers {

    /// Only cb's latest version.
    TYPE_CODE_BLOCKS = 'codeblocks20.03';
    TYPE_DEV_CPP = 'devcpp';
    TYPE_MINGW64 = 'mingw64';
    TYPE_VS2015 = 'vs2015';
    TYPE_VS2017 = 'vs2017';
    TYPE_VS2019 = 'vs2019';
    TYPE_VS2022 = 'vs2022';

    /// will try auto detect.
    TYPE_LATEST_VISUAL_STUDIO = 'vs_latest';

    choosedCompiler = null;
    onCompleteCallback = null;

    constructor() {
    }

    chooseCompilerByUser() {
        const platformName = os.platform();
        if (platformName !== 'win32' && platformName !== 'cygwin') { /// 目前仅支持 windows
            vscode.window.showErrorMessage(`ege: Platform ${platformName} is not supported by now!`);
            return null;
        }

        let quickPickTitle = [this.TYPE_LATEST_VISUAL_STUDIO, this.TYPE_VS2022, this.TYPE_VS2019, this.TYPE_VS2017, this.TYPE_VS2015, this.TYPE_DEV_CPP, this.TYPE_MINGW64, this.TYPE_CODE_BLOCKS];

        const vswhere = 'C:/Program Files (x86)/Microsoft Visual Studio/Installer/vswhere.exe';
        if (fs.existsSync(vswhere)) {
            /// try to find installed visual studio
            let output = childProcess.execSync(`"${vswhere}" -property installationPath`);
            if (output) {
                const arrOutput = output.toString().split(os.EOL);
                if (arrOutput && arrOutput.length > 0) {
                    if (arrOutput[arrOutput.length - 1].length === 0) {
                        --arrOutput.length;
                    }

                    quickPickTitle = arrOutput.concat(quickPickTitle);
                    console.log("ege: find installed visual studio path: " + output);
                }
            }
        }

        this.choosedCompiler = null;
        return vscode.window.showQuickPick(quickPickTitle, {
            title: "ege: Choose the specific compiler to install.",
            canPickMany: false,
            // matchOnDescription: this.TYPE_LATEST_VISUAL_STUDIO
        });
    }

    performInstall(type, onComplete) {

        if (type) {
            this.choosedCompiler = type;
        }

        this.onCompleteCallback = onComplete;

        switch (this.choosedCompiler) {
            case this.TYPE_VS2015:
            case this.TYPE_VS2017:
            case this.TYPE_VS2019:
            case this.TYPE_VS2022:
            case this.TYPE_LATEST_VISUAL_STUDIO:
                this.performInstallVisualStudio();
                break;
            case this.TYPE_DEV_CPP:
                this.performInstallDevCpp();
            case this.TYPE_CODE_BLOCKS:
                this.performInstallCodeBlocks();
                break;
            case this.TYPE_MINGW64:
                this.performInstallMinGW64();
                break;
            default:
                vscode.window.showInformationMessage("ege: Compiler choosed: " + this.choosedCompiler);
                this.performInstallVisualStudio();
                break;
        }
    }

    DIR_INCLUDE = 'include';
    DIR_LIBS = 'lib';

    /**
     * @param {string} dir 
     */
    guessCppEnvPath(dir) {

    }

    performInstallVisualStudio() {
        if (fs.existsSync(this.choosedCompiler)) {
            /// User specified dir. May be some version of visual studio.

        }
    }

    performInstallDevCpp() {

    }

    performInstallCodeBlocks() {

    }

    performInstallMinGW64() {

    }
};

module.exports = Compilers;