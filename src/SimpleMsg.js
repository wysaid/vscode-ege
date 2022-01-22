// @ts-nocheck
/**
 * Author: wysaid
 * Date: 2021-10-08
 */
'use strict';

const vscode = require('vscode');

class SimpleMsg {

    msgPrefix = "";

    /**
     * @param {string} msg 
     */
    constructor(msg) {
        this.msgPrefix = `[${msg}]:`;
    }

    /**
     * @param {string} info 
     */
    showInfo(info) {
        vscode.window.showInformationMessage(this.msgPrefix + info);
    }

    showError(error) {
        vscode.window.showErrorMessage(this.msgPrefix + error);
    }

    /**
     * @abstract 弹出一个文本输入对话框, 获取一段输入.
     * @param {string} title 
     * @param {function} onComplete 
     * @param {string} placeholder 
     */
    ask(title, onComplete, placeholder) {
        vscode.window.showInputBox({
            title: title,
            placeHolder: placeholder
        }).then((value) => {
            onComplete(value || "");
        }, (reason) => {
            console.error(reason);
            onComplete();
        });
    }
}


module.exports = SimpleMsg;