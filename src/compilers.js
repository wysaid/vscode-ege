// @ts-nocheck
/**
 * Author: wysaid
 * Date: 2022-1-23
 */
'use strict';

/// hard code to detect compilers

const vscode = require('vscode');

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
        this.choosedCompiler = null;
        return vscode.window.showQuickPick([this.TYPE_LATEST_VISUAL_STUDIO, this.TYPE_VS2022, this.TYPE_VS2019, this.TYPE_VS2017, this.TYPE_VS2015, this.TYPE_DEV_CPP, this.TYPE_MINGW64, this.TYPE_CODE_BLOCKS], {
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
                vscode.window.showErrorMessage("ege: Invalid compiler choosed: " + this.choosedCompiler);
                break;
        }
    }

    performInstallVisualStudio() {

    }

    performInstallDevCpp() {

    }

    performInstallCodeBlocks() {

    }

    performInstallMinGW64() {

    }
};

module.exports = Compilers;