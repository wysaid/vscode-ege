// @ts-nocheck
/**
 * Author: wysaid
 * Date: 2022-1-23
 */
'use strict';

const cp = require('child_process');
const os = require('os');
const vscode = require('vscode')

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

module.exports = EGEUtils;