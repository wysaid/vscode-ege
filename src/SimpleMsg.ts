/**
 * Author: wysaid
 * Date: 2021-10-08
 */

import vscode = require('vscode');

export class SimpleMsg {

    static msgPrefix = "";

    constructor(msg: string) {
        SimpleMsg.msgPrefix = `[${msg}]:`;
    }

    static showInfo(info: string) {
        vscode.window.showInformationMessage(this.msgPrefix + info);
    }

    static showError(error: string) {
        vscode.window.showErrorMessage(this.msgPrefix + error);
    }

    /**
     *  弹出一个文本输入对话框, 获取一段输入.
     */
    static ask(title: string, onComplete: Function, placeholder?: string) {
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