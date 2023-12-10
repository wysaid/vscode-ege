/**
 * Author: wysaid
 * Date: 2021-10-08
 */

import vscode = require('vscode');

export namespace ege {
    const msgPrefix = "[ege]:";

    /**
     *  弹出一个文本输入对话框, 获取一段输入.
     */
    export function ask(title: string, onComplete: Function, placeholder?: string) {
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

    let outputChannel: vscode.OutputChannel;
    export function getOutputChannel() {
        if (!outputChannel) {
            outputChannel = vscode.window.createOutputChannel("ege");
        }
        return outputChannel;
    }

    export function printInfo(msg: string, preserveFocus?: boolean) {
        const channel = getOutputChannel();
        channel.appendLine(`[ege]: ${msg}`);
        if (preserveFocus !== undefined) {
            channel.show(preserveFocus);
        }
    }

    export function printWarning(msg: string) {
        printInfo(msg, false);
    }

    export function printError(msg: string) {
        printInfo(msg, true);
    }

    export function showOutputChannel(preserveFocus?: boolean) {
        getOutputChannel().show(preserveFocus);
    }

    /**
     * @description 在右下角显示一段信息
     */
    export function showInfo(info: string, ...items: string[]): Thenable<string | undefined> {
        printInfo(msgPrefix + info);
        return vscode.window.showInformationMessage(msgPrefix + info, ...items);
    }

    /**
     * @description 在右下角显示一段错误信息
     */
    export function showError(error: string, ...items: string[]): Thenable<string | undefined> {
        printError(msgPrefix + error);
        return vscode.window.showErrorMessage(msgPrefix + error, ...items);
    }
}
