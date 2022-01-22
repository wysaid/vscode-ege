// @ts-nocheck
/**
 * Author: wysaid
 * Date: 2021-10-08
 */
'use strict';

const vscode = require('vscode')

const https = require('https');
const path = require('path');
const fs = require('fs-extra');
const os = require('os');
const Unzipper = require('decompress-zip');

const Msg = require('./SimpleMsg')
const RequestMsg = require('./RequestMsg');


module.exports = class {

    /**
     * @type {vscode.ExtensionContext} context
     */
    pluginContext = null;

    egeTempDir = null;
    egeDownloadDir = null;
    egeDownloadUrl = "https://xege.org/download/ege-latest-version";
    egeDownloadedZipFile = null;
    egeLatestVersion = null;
    egeInstallerDir = null;

    /**
     * @type {SimpleMsg} context
     */
    msgHandle = null;

    /**
     * @type {RequestMsg} context
     */
    progressHandle = null;

    /**
     * @param {vscode.ExtensionContext} context
     */
    constructor(context) {
        //@type {vscode.ExtensionContext}
        this.pluginContext = context;

        //@type {SimpleMsg}
        this.msgHandle = new Msg('ege');

        //@type {RequestMsg}
        this.progressHandle = new RequestMsg();
        this.setupContext();
    }

    setupContext() {
        this.egeTempDir = path.join(os.tmpdir(), this.pluginContext.extension.id);
        console.log("The ege plugin storage path is: " + this.egeTempDir);
        this.egeDownloadDir = path.join(this.egeTempDir, "Download");

        return true;
    }

    performInstall() {

        if (!fs.pathExistsSync(this.egeDownloadDir)) {
            fs.mkdirSync(this.egeDownloadDir);
        }

        if (!fs.existsSync) {
            vscode.window.showErrorMessage("Create tmp directory failed!\n");
            return false;
        }

        /// Check for the latest version.
        this.checkExistingDownload((exists) => {
            if (!exists) {

                if (!this.egeDownloadedZipFile) {
                    vscode.window.showErrorMessage("Get latest ege version failed! Make sure you're online!");
                    return;
                }

                this.performDownload((err) => {
                    if (err) {
                        console.error("Error downloading: " + err);
                        vscode.window.showErrorMessage("ege: download ege zip failed!!");
                    } else {
                        this.performUnzip((err) => {
                            if (err) {
                                console.error("Error unzipping: " + err);
                                vscode.window.showErrorMessage(`ege: unzip ${this.egeDownloadedZipFile} failed!`);
                            }
                        });
                    }
                });
            } else {
                vscode.window.showInformationMessage("EGE is already downloaded!");
            }
        });
    }

    checkExistingDownload(callback) {
        this.getLatestVersion((v) => {
            if (v && v.length > 0) {
                /// 检查对应版本号的文件是否存在.
                this.egeLatestVersion = v;
                this.egeDownloadedZipFile = this.egeDownloadDir + `/ege_${v}.zip`;
                console.log("checkExistingDownload: " + this.egeDownloadedZipFile);
            } else {
                this.egeDownloadedZipFile = null;
            }
            callback(this.egeDownloadedZipFile != null && fs.existsSync(this.egeDownloadedZipFile));
        });
    }

    performDownload(onComplete) {

        const p = this.requestUrlData(this.egeDownloadUrl, this.egeDownloadedZipFile);
        if (p) {
            p.then(onComplete, onComplete);
        } else {
            onComplete("Error Downloading: " + this.egeDownloadedZipFile);
        }
    }

    performUnzip(onComplete) {
        const unzip = new Unzipper(this.egeDownloadedZipFile);
        unzip.on('extract', () => {
            console.log("Finished unzipping...");
            onComplete();
        });

        unzip.on('error', (err) => {
            console.log("Error unzipping");
            onComplete(err);
        });

        const extractDir = this.egeTempDir + '/Install';

        if (!fs.pathExistsSync(extractDir)) {
            fs.mkdirSync(extractDir);
        }

        unzip.extract({
            path: extractDir
        });
    }

    getLatestVersion(callback) {
        /// Never return null when request string content.
        this.requestUrlData(this.egeDownloadUrl + "?getVersion", null).then(callback, callback);
    }

    clearPluginCache() {
        /// remove caches.
        if (this.egeTempDir && this.egeTempDir.length !== 0 && fs.pathExistsSync(this.egeTempDir)) {
            this.progressHandle.start();
            setTimeout(() => {
                fs.removeSync(this.egeTempDir);
                vscode.window.showInfoMessage("Cleanup ege plugin cache - Done!");
            }, 1);
        }
    }

    /**
     * 
     * @param {string} url 
     * @param {string} fileToSave 
     * @param {function} onComplete response text will be passed when 'fileToSave' is null.
     * @returns {Promise | null} Promise to download or null if 'fileToSave' is not null but cannot be written to.
     */
    requestUrlData(url, fileToSave) {

        /// hidden argument for url redirect.
        const redirectCount = arguments.length > 2 && arguments[2] ? arguments[2] : 0;

        if (redirectCount === 0) {
            /// Only validate file in first request.
            if (fileToSave && fileToSave.length != 0 && fs.existsSync(fileToSave)) {
                /// File must be writable if exists.
                if (!fs.accessSync(fileToSave, fs.constants.W_OK)) {
                    vscode.window.showErrorMessage(`File ${fileToSave} already exists and cannot be overwrite!`);
                    return null;
                }
            }
        } else if (redirectCount > 5) {
            vscode.window.showErrorMessage("Too many redirects, stop!");
            return null;
        }

        return new Promise((resolve, reject) => {
            const request = https.get(url, (response) => {
                if (response.statusCode === 302 || response.statusCode === 301) {
                    let redirectLocation = response.headers.location;
                    if (redirectLocation.indexOf('://') < 0) {
                        redirectLocation = path.join(url, redirectLocation);
                    }
                    const ret = this.requestUrlData(redirectLocation, fileToSave, redirectCount + 1);
                    if (ret) {
                        ret.then(resolve, reject);
                    }
                } else if (response.statusCode === 200) {
                    if (fileToSave) {
                        const writeStream = fs.createWriteStream(fileToSave);
                        response.pipe(writeStream, { end: true });
                        response.on('end', () => {
                            writeStream.end();
                            console.log(`Downloading ${url} OK, file: ${fileToSave}`);
                            resolve();
                        });
                    } else {
                        let strContent = "";
                        response.on('data', data => {
                            strContent += data;
                        });

                        response.on('end', () => {
                            console.log(`Request url ${url} OK, content: ${strContent}`);
                            resolve(strContent);
                        });
                    }
                } else {
                    /// Unexpected err.
                    reject(`Server respond with ${response.statusCode} - ${response.statusMessage}`);
                }
            });
            request.on('error', (err) => {
                console.log(`ege error: ${err}`);
                reject(err);
            });
        });
    }

    cleanup() {
        if (this.progressHandle) {
            this.progressHandle.cancel();
            this.progressHandle = null;
        }

        this.msgHandle = null;
    }
}

