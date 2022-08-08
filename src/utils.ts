/**
 * Author: wysaid
 * Date: 2022-1-23
 */

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
    const graphicsHeaderPath = path.join(dir, 'include/graphics.h');
    const egeHeaderPath = path.join(dir, 'include/ege.h');

    if (fs.existsSync(graphicsHeaderPath) && fs.existsSync(egeHeaderPath)) {
        console.log("EGE: Find " + graphicsHeaderPath);
        console.log("EGE: Find " + egeHeaderPath);
    } else {
        console.error("EGE: No header at dir: " + dir);
        return false;
    }

    const libsDirArray = [
        'graphics.lib',
        'amd64/graphics.lib',
        'amd64/graphics64.lib',
        'x86/graphics.lib',
        'x64/graphics64.lib',
    ];

    let findedLibs = new Array();

    libsDirArray.forEach(name => {
        let sdkLibDir = path.join(dir, 'lib');
        if (sdkLibDir.indexOf('wysaid.ege') !== -1 && sdkLibDir.indexOf('Install') !== -1) {
            /// The plugin temp directory, choose vs2019 to test.
            sdkLibDir = path.join(sdkLibDir, 'vs2019');
        }
        const libPath = path.join(sdkLibDir, name);
        if (fs.existsSync(libPath)) {
            findedLibs.push(libPath);
        }
    });

    if (findedLibs.length !== 0) {
        findedLibs.forEach(f => {
            console.log("EGE: Find lib file at: " + f);
        });
        return true;
    } else {
        console.error("EGE: EGE libraries not found at: " + dir);
        return false;
    }
}

module.exports = EGEUtils;