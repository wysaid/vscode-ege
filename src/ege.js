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

const RequestMsg = require('./RequestMsg');
const Compilers = require('./compilers');

class EGE {

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
    egeIncludeDir = null;
    egeLibsDir = null;
    egeDemoDir = null;

    /**
     * @type {RequestMsg} context
     */
    progressHandle = null;
    installationCancelled = false;

    /**
     * @type {Compilers}
     */
    compilers = null;

    /**
     * @param {vscode.ExtensionContext} context
     */
    constructor(context) {
        //@type {vscode.ExtensionContext}
        this.pluginContext = context;
        this.setupContext();
    }

    setupContext() {
        this.egeTempDir = path.join(os.tmpdir(), this.pluginContext.extension.id);
        console.log("The ege plugin storage path is: " + this.egeTempDir);
        this.egeDownloadDir = path.join(this.egeTempDir, "Download");
        this.egeInstallerDir = path.join(this.egeTempDir, "Install");
        this.egeIncludeDir = path.join(this.egeInstallerDir, "include");
        this.egeLibsDir = path.join(this.egeInstallerDir, "lib");
        this.egeDemoDir = path.join(this.egeInstallerDir, "demo");

        return true;
    }

    performInstall() {

        if (fs.existsSync(this.egeInstallerDir)) {

            const quickPicks = [
                {
                    label: "Cleanup Downloads(Redo Download)",
                    description: "清除现有下载项, 重新下载",
                    picked: false

                },
                {
                    label: "Cleanup Installation(Redo Install)",
                    description: "清除现有安装, 重新安装",
                    picked: true
                }];
            vscode.window.showQuickPick(quickPicks, {
                title: "ege: Existing installation detected, choose actions you want",
                canPickMany: true
            }).then(value => {
                if (value) {
                    let removeDownload = false;
                    let removeInstall = false;

                    value.forEach(s => {
                        if (s === quickPicks[0]) {
                            removeDownload = true;
                        } else if (s === quickPicks[1]) {
                            removeInstall = true;
                        }
                    });

                    if (removeDownload && this.removeInstall) {
                        this.clearPluginCache();
                    } else {
                        if (removeDownload && fs.existsSync(this.egeDownloadDir)) {
                            fs.removeSync(this.egeDownloadDir);
                        }

                        if (removeInstall && fs.existsSync(this.egeInstallerDir)) {
                            fs.removeSync(this.egeInstallerDir);
                        }
                    }

                    this.performInstall();
                } else {
                    vscode.window.showInformationMessage("ege: install cancelled");
                }
            }, rejectReason => {
                vscode.window.showInformationMessage("ege: install cancelled: " + rejectReason)
            });

            // vscode.window.showInputBox({
            //     title: "ege: Existing installation detected, input 'yes' to perform cleanup and continue?",
            //     value: "yes"
            // }).then(value => {
            //     if (value === 'yes') {
            //         console.log("Perform cleanup...");
            //         this.clearPluginCache();
            //         if (!fs.existsSync(this.egeInstallerDir)) {
            //             // retry.
            //             this.performInstall();
            //         } else {
            //             /// Cleanup failed?
            //             vscode.window.showErrorMessage("ege: Unexpected error: Perform cleanup failed.");
            //         }
            //     } else {
            //         vscode.window.showInformationMessage('ege: Installation cancelled!');
            //     }
            // });
            return;
        }

        if (this.progressHandle && this.progressHandle.progressInstance) {
            vscode.window.showErrorMessage("ege: last progress not finished! Waiting... You can reload this window if you're waiting too long.");
            return;
        }

        if (!fs.pathExistsSync(this.egeDownloadDir)) {
            fs.mkdirpSync(this.egeDownloadDir);
        }

        if (!fs.existsSync) {
            vscode.window.showErrorMessage("ege: Create tmp directory failed!\n");
            return false;
        }

        this.progressHandle = new RequestMsg('Install EGE', 'ege');
        this.installationCancelled = false;
        this.progressHandle.start("Fetching latest ege version...", async () => {
            /// Cancelled by user.
            this.installationCancelled = true;
            setTimeout(() => {
                this.progressHandle = null;
            }, 1);
        });

        const nextStep = () => {
            this.progressHandle.updateProgress("Perform unzipping " + this.egeDownloadedZipFile);
            this.performUnzip((err) => {
                if (err) {
                    console.error("Error unzipping: " + err);
                    vscode.window.showErrorMessage(`ege: unzip ${this.egeDownloadedZipFile} failed!`);
                    fs.removeSync(this.egeInstallerDir);
                    this.progressHandle.reject();
                } else {
                    this.progressHandle.resolve();
                    vscode.window.showInformationMessage("ege: Installer prepared, please choose a compiler!");
                    this.performCompilerInstallation();
                }
            });
        };

        /// Check for the latest version.
        this.checkExistingDownload((exists) => {
            if (!exists) {
                if (!this.egeDownloadedZipFile) {
                    vscode.window.showErrorMessage("ege: Get latest ege version failed! Make sure you're online!");
                    this.progressHandle.reject();
                    return;
                }

                this.progressHandle.updateProgress("Downloading " + this.egeDownloadUrl);
                this.performDownload((err) => {
                    if (err) {
                        console.error("Error downloading: " + err);
                        vscode.window.showErrorMessage("ege: download ege zip failed!!");
                    } else {
                        nextStep();
                    }
                });
            } else {
                vscode.window.showInformationMessage("EGE is already downloaded, skip downloading");
                nextStep();
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

    performCompilerInstallation() {
        if (this.compilers) {
            vscode.window.showErrorMessage("Last installation not finished!");
            return;
        }

        this.compilers = new Compilers();
        this.compilers.chooseCompilerByUser().then(value => {
            if (value) {
                this.compilers.performInstall(value, () => {
                    vscode.window.showInformationMessage("ege: install finished!");
                    this.compilers = null;
                });
            } else {
                vscode.window.showWarningMessage("ege: choosing compiler cancelled!");
                this.compilers = null;
            }
        }, () => {
            vscode.window.showWarningMessage("ege: no compiler choosed.");
            this.compilers = null;
        });
    }

    cleanupInstallDir() {
        if (fs.pathExistsSync(this.egeInstallerDir)) {
            fs.removeSync(this.egeInstallerDir);
        }
    }

    fixInstallDirContents() {
        if (!fs.existsSync(this.egeInstallerDir)) {
            return;
        }

        if (fs.existsSync(this.egeIncludeDir) && fs.existsSync(this.egeLibsDir)) {
            const includeFiles = fs.readdirSync(this.egeIncludeDir);
            const libsFiles = fs.readdirSync(this.egeLibsDir);
            if (includeFiles.length != 0 && libsFiles.length != 0) {
                /// no inner paths.
                console.log("Skip path fix...");
                return;
            }
        }

        fs.removeSync(this.egeIncludeDir);
        fs.removeSync(this.egeLibsDir);
        fs.removeSync(this.egeDemoDir);

        const installDirContents = fs.readdirSync(this.egeInstallerDir);
        if (installDirContents.length === 0) {
            vscode.window.showErrorMessage("ege: No content in the installation dir at: " + this.egeInstallerDir);
            return;
        }

        let validInnerDir = null;
        let validIncludeDir = null;
        let validLibsDir = null;

        /// find install dir.
        installDirContents.forEach(file => {
            console.log("ege: enum install dir content - " + file);
            const newInstallDir = path.join(this.egeInstallerDir, file);
            const newIncludeDir = path.join(newInstallDir, 'include');
            const newlibsDir = path.join(newInstallDir, 'lib');
            if (fs.existsSync(newIncludeDir) && fs.existsSync(newlibsDir)) {
                if (!validInnerDir) { // pick first
                    validInnerDir = newInstallDir;
                    validIncludeDir = newIncludeDir;
                    validLibsDir = newlibsDir;
                } else {
                    vscode.window.showErrorMessage("ege: multi installation dir found, pick the first: " + validInnerDir);
                }
            }
        });

        if (validInnerDir && validIncludeDir && validLibsDir) { /// perform moving...
            fs.moveSync(validIncludeDir, this.egeIncludeDir);
            fs.moveSync(validLibsDir, this.egeLibsDir);
            let demoDir = path.join(validInnerDir, 'demo');
            if (fs.existsSync(demoDir)) {
                let demoSrcDir = path.join(demoDir, 'src');
                if (fs.existsSync(demoSrcDir)) {
                    demoDir = demoSrcDir;
                }
                fs.moveSync(demoDir, this.egeDemoDir);
            }
        }
    }

    performUnzip(onComplete) {
        const unzip = new Unzipper(this.egeDownloadedZipFile);
        unzip.on('extract', () => {
            console.log("Finished unzipping...");

            /// Check installation, remove inner dir.
            this.fixInstallDirContents();
            onComplete();
        });

        unzip.on('error', (err) => {
            console.log("Error unzipping");
            onComplete(err);
        });

        this.cleanupInstallDir();

        fs.mkdirpSync(this.egeInstallerDir);

        unzip.extract({
            path: this.egeInstallerDir
        });
    }

    getLatestVersion(callback) {
        /// Never return null when request string content.
        this.requestUrlData(this.egeDownloadUrl + "?getVersion", null).then(callback, callback);
    }

    clearPluginCache() {
        /// remove caches.
        if (this.egeTempDir && this.egeTempDir.length !== 0 && fs.pathExistsSync(this.egeTempDir)) {
            fs.removeSync(this.egeTempDir);
            vscode.window.showInformationMessage("ege: Cleanup ege plugin cache - Done!");
        }

        if (this.progressHandle) {
            this.progressHandle.cancel();
            this.progressHandle = null;
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
                    vscode.window.showErrorMessage(`ege: File ${fileToSave} already exists and cannot be overwrite!`);
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
    }
}

module.exports = EGE;