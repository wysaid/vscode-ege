// @ts-nocheck
/**
 * Author: wysaid
 * Date: 2021-10-08
 */
'use strict';

const vscode = require('vscode');

module.exports = class {

    msgPrefix = "";

    constructor(msg) {
        this.msgPrefix = `[${msg}]:`;
    }

    showInfo(info) {
        vscode.window.showInformationMessage(this.msgPrefix + info);
    }

    showError(error) {
        vscode.window.showErrorMessage(this.msgPrefix + error);
    }

    ask(title, onComplete, placeholder) {
        vscode.window.showInputBox({
            title: title,
            placeHolder: placeholder
        }).then((value) => {
            onComplete(value || "");
        }, (reason) => {
            console.error(reason);
            onComplete("");
        });
    }
}
