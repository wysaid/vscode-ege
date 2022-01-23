// @ts-nocheck
// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
'use strict';

const vscode = require('vscode');
const cp = require('child_process');
const os = require('os');
const fs = require('fs-extra');

const EGE = require('./ege');
const { stderr } = require('process');

/**
 * @type {EGE}
 */
let egeHandle = null;

/**
 * @param {vscode.ExtensionContext} context
 */
function activate(context) {

	// Use the console to output diagnostic information (console.log) and errors (console.error)
	// This line of code will only be executed once when your extension is activated
	console.log('Congratulations, your extension "ege" is now active!');

	egeHandle = new EGE(context);

	context.subscriptions.push(vscode.commands.registerCommand('ege.setup-project', () => {
		vscode.window.showInformationMessage("ege: setup-project!!\n");
	}));

	context.subscriptions.push(vscode.commands.registerCommand('ege.setup-global', () => {
		vscode.window.showInformationMessage("ege: setup-global!!\n");
		egeHandle.performInstall();
	}));

	context.subscriptions.push(vscode.commands.registerCommand('ege.cleanup-caches', () => {
		egeHandle.clearPluginCache();
	}));

	context.subscriptions.push(vscode.commands.registerCommand('ege.open-cache-dir', () => {
		if (egeHandle.egeInstallerDir && fs.existsSync(egeHandle.egeInstallerDir)) {
			const osName = os.platform();
			let openExplorerCommand = null;
			if (osName === 'win32' || osName === 'cygwin') { /// win
				openExplorerCommand = `explorer.exe "${egeHandle.egeInstallerDir}"`;
			} else if (osName === 'darwin') { /// mac
				openExplorerCommand = `open "${egeHandle.egeInstallerDir}"`;
			} else if (osName === 'linux') {
				openExplorerCommand = `xdg-open "${egeHandle.egeInstallerDir}"`;
			} else {
				vscode.window.showErrorMessage(`ege: open cache dir is not supported on ${egeHandle.egeInstallerDir}`);
			}

			if (openExplorerCommand) {
				cp.exec(openExplorerCommand, (err) => {
					if (err)
						vscode.window.showInformationMessage(`ege: open cache dir ${egeHandle.egeInstallerDir} failed: ${err}`)
				});
			}
		} else {
			vscode.window.showErrorMessage(`ege: Cache dir ${egeHandle.egeInstallerDir} does not exist.`)
		}
	}));
}

// this method is called when your extension is deactivated
function deactivate() {
	/// cleanup
	if (egeHandle) {
		egeHandle.cleanup();
		egeHandle = null;
	}
}

module.exports = {
	activate,
	deactivate
}
