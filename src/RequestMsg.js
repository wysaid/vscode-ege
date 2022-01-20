// @ts-nocheck
/**
 * Author: wysaid
 * Date: 2021-10-08
 */
'use strict';
const vscode = require('vscode');

/// End in 1 minute.
const LONG_REQUEST_TIMEOUT_VALUE = 60000;

/// 执行一个长请求 (比如请求网络)
module.exports = class {
    title = "";
    msgPrefix = "";
    intervalHandle = null;
    progressInstance = null;
    progressToken = null;
    progressPercent = 0;
    progressPercentTo = 0;
    progressReject = null;
    progressResolve = null;
    progressDurationTimeInMs = 0;
    progressTimeoutValue = LONG_REQUEST_TIMEOUT_VALUE;
    showingMessage = "request";

    constructor() {
    }

    start(title, msgPrefix) {
        this.title = title;
        this.msgPrefix = `[${msgPrefix}]: `;
        const localThis = this;

        if (this.progressInstance) {
            this.cancel();
        }

        vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: this.title,
            cancellable: true,
        }, async (progress, token) => {
            localThis.progressInstance = progress;
            localThis.progressToken = token;
            token.onCancellationRequested(localThis.onCancellationRequested.bind(localThis));
            progress.report({ increment: 1, message: msgPrefix + "start!" });

            if (localThis.intervalHandle) {
                console.error(msgPrefix + "intervalHandle = " + localThis.intervalHandle);
                vscode.window.showErrorMessage(msgPrefix + "Last job not finished, try to stop it...\n");
                clearInterval(localThis.intervalHandle);
                localThis.intervalHandle = null;
            }

            const p = new Promise((resolve, reject) => {
                localThis.progressResolve = resolve;
                localThis.progressReject = reject;
                localThis.progressDurationTimeInMs = 0;
                localThis.intervalHandle = setInterval(() => {

                    if (!localThis.progressInstance || !localThis.progressToken || localThis.progressToken.isCancellationRequested) {
                        localThis.cancel();
                        return;
                    }

                    localThis.progressDurationTimeInMs += 500;
                    if (localThis.progressDurationTimeInMs > localThis.progressTimeoutValue) {
                        localThis.onError(msgPrefix + "request time out");
                        return;
                    }

                    if (localThis.progressPercentTo < 99) {
                        let increment = localThis.progressPercentTo - localThis.progressPercent;
                        if (increment === 0 && localThis.progressPercentTo < 50) {
                            /// 默认更新一下, 防止认为任务死掉了
                            increment = 1;
                        }
                        localThis.progressPercentTo += increment;
                        localThis.progressPercent = localThis.progressPercentTo;
                        progress.report({ increment: increment, message: localThis.showingMessage });
                        console.log("Progress update - " + localThis.showingMessage + " " + localThis.progressPercent);
                        console.log("Taking time: " + localThis.progressDurationTimeInMs);
                    }
                }, 500);

                console.error("intervalHandle = " + localThis.intervalHandle);
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

    clearProgressInterval() {
        if (this.intervalHandle) {
            clearInterval(this.intervalHandle);
            this.intervalHandle = null;
        }
        this.progressToken = null;
        this.progressInstance = null;
    }

    cancel(reason) {
        if (this.progressReject) {
            this.progressReject(reason);
            this.progressReject = null;
            this.progressResolve = null;
        }

        this.clearProgressInterval();
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

        this.cancel();
        this.clearProgressInterval();
    }

    onError(msg) {
        this.cancel(msg);
    }
}
