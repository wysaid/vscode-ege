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

/// End in 1 minute.
const LONG_REQUEST_TIMEOUT_VALUE = 60000;

/// 执行一个长请求 (比如请求网络)
export class RequestMsg {
    title = "";
    msgPrefix = "";
    intervalHandle: NodeJS.Timeout | null = null;
    progressInstance: vscode.Progress<any> | null = null;
    progressToken: vscode.CancellationToken | null = null;
    progressPercent = 0;
    progressPercentTo = 0;
    progressReject: Function | null = null;
    progressResolve: Function | null = null;
    progressDurationTimeInMs = 0;
    progressTimeoutValue = LONG_REQUEST_TIMEOUT_VALUE;
    showingMessage = "";

    cancelCallback: Function | null = null;

    constructor(title: string, msgPrefix: string) {
        this.title = title;
        this.msgPrefix = `[${msgPrefix}]: `;
    }

    start(showingMessage: string, cancelCallback: Function) {

        this.showingMessage = showingMessage;
        this.cancelCallback = cancelCallback;
        const msgPrefix = this.msgPrefix;

        if (this.progressInstance) {
            this.cancel();
        }

        vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: this.title,
            cancellable: true,
        }, async (progress, token) => {
            this.progressInstance = progress;
            this.progressToken = token;
            token.onCancellationRequested(this.onCancellationRequested.bind(this));
            progress.report({ increment: 1, message: msgPrefix + "start!" });

            if (this.intervalHandle) {
                console.error(msgPrefix + "intervalHandle = " + this.intervalHandle);
                vscode.window.showErrorMessage(msgPrefix + "Last job not finished, try to stop it...\n");
                clearInterval(this.intervalHandle);
                this.intervalHandle = null;
            }

            const p = new Promise((resolve, reject) => {
                this.progressResolve = resolve;
                this.progressReject = reject;
                this.progressDurationTimeInMs = 0;
                this.intervalHandle = setInterval(() => {

                    if (!this.progressInstance || !this.progressToken || this.progressToken.isCancellationRequested) {
                        this.cancel();
                        return;
                    }

                    this.progressDurationTimeInMs += 500;
                    if (this.progressDurationTimeInMs > this.progressTimeoutValue) {
                        this.onError(msgPrefix + "request time out");
                        return;
                    }

                    if (this.progressPercentTo < 99) {
                        let increment = this.progressPercentTo - this.progressPercent;
                        if (increment === 0 && this.progressPercentTo < 50) {
                            /// 默认更新一下, 防止认为任务死掉了
                            increment = 1;
                        }
                        this.progressPercentTo += increment;
                        this.progressPercent = this.progressPercentTo;
                        progress.report({ increment: increment, message: this.showingMessage });
                        console.log("Progress update - " + this.showingMessage + " " + this.progressPercent);
                        console.log("Taking time: " + this.progressDurationTimeInMs);
                    }
                }, 500);

                console.log("intervalHandle = " + this.intervalHandle);
            });

            return p;
        }).then(() => {
            if (this.intervalHandle) {
                this.cancel();
            }

            this.progressInstance = null;
            this.progressToken = null;
        }, (reason) => {
            console.log(this.msgPrefix + " Killing request.");
            vscode.window.showErrorMessage(this.msgPrefix + "process cancelled! Reason: " + reason);
        });
    }

    updateProgress(msg: string) {
        if (this.progressPercentTo < 95) {
            if (this.progressPercentTo < 70) {
                this.progressPercentTo += 15;
            } else {
                this.progressPercentTo += 5;
            }
        }
        this.showingMessage = msg;
    }

    clearProgressInterval() {
        if (this.intervalHandle) {
            clearInterval(this.intervalHandle);
            this.intervalHandle = null;
        }
        this.progressToken = null;
        this.progressInstance = null;
    }

    cancel(reason?: any) {
        if (this.progressReject) {
            this.progressReject(reason);
            this.progressReject = null;
            this.progressResolve = null;
        }

        this.clearProgressInterval();
    }

    reject() {
        this.cancel();
    }

    resolve() {
        if (this.progressResolve) {
            this.progressResolve();
            this.progressResolve = null;
            this.progressReject = null;
        }

        this.clearProgressInterval();
    }

    onCancellationRequested() {
        if (this.cancelCallback) {
            this.cancelCallback();
        }
        this.cancel();
        this.clearProgressInterval();
    }

    /**
     * @param {string} msg 
     */
    onError(msg: string) {
        if (this.cancelCallback) {
            this.cancelCallback();
        }
        this.cancel(msg);
    }
}
