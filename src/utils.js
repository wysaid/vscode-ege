// @ts-nocheck
/**
 * Author: wysaid
 * Date: 2022-1-23
 */
'use strict';

const cp = require('child_process');
const os = require('os');
const vscode = require('vscode');
const fs = require('fs-extra');
const path = require('path');

class EGEUtils {
}

/**
 * @param {string} dir 
 */
EGEUtils.openDirectoryInFileExplorer = function (dir) {
    const osName = os.platform();
    let openExplorerCommand = null;
    if (osName === 'win32' || osName === 'cygwin') { /// win
        openExplorerCommand = `explorer.exe "${dir}"`;
    } else if (osName === 'darwin') { /// mac
        openExplorerCommand = `open "${dir}"`;
    } else if (osName === 'linux') {
        openExplorerCommand = `xdg-open "${dir}"`;
    } else {
        vscode.window.showErrorMessage(`EGE: Open dir is not supported on ${dir}`);
    }

    if (openExplorerCommand) {
        cp.exec(openExplorerCommand, (err) => {
            if (err)
                vscode.window.showInformationMessage(`EGE: Open dir ${dir} failed: ${err}`)
        });
    }
}

/**
 * 
 * @param {string} dir 
 */
EGEUtils.validateInstallationOfDirectory = function (dir) {
    /// Check `graphics.h`
    if (fs.existsSync(path.join(dir, 'graphics.h') && fs.existsSync(path.join(dir, 'ege.h')))) {
        vscode.window.showInformationMessage("EGE: Finish installation, dst include dir: " + dir);
    } else {
        vscode.window.showErrorMessage("EGE: Install failed! EGE Headers not found at: " + dir);
    }

    const libsDirArray = [
        'graphics.lib',
        'amd64/graphics.lib',
        'amd64/graphics.lib',
        'x86/graphics.lib',
        'x64/graphics.lib',
    ];

    let findedLibs = new Array();

    libsDirArray.forEach(name => {
        const libPath = path.join(this.installerLibsPath, name);
        if (fs.existsSync(libPath)) {
            findedLibs.push(libPath);
        }
    });

    if (findedLibs.length !== 0) {
        console.log("EGE: Find installation at: " + findedLibs.join(';'));
    } else {
        console.log("EGE: EGE libraries not found at: " + dir);
    }

    return findedLibs.length !== 0;
}

module.exports = EGEUtils;