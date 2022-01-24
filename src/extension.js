// @ts-nocheck
// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
'use strict';

const vscode = require('vscode');
const fs = require('fs-extra');

const EGE = require('./ege');

/**
 * @type {EGEUtils}
 */
const utils = require('./utils')

/**
 * @param {vscode.ExtensionContext} context
 */
function activate(context) {

	// Use the console to output diagnostic information (console.log) and errors (console.error)
	// This line of code will only be executed once when your extension is activated
	console.log('Congratulations, your extension "ege" is now active!');

	EGE.registerContext(context);

	context.subscriptions.push(vscode.commands.registerCommand('ege.setup-project', () => {
		vscode.window.showInformationMessage("EGE: Setup-project!!\n");
	}));

	context.subscriptions.push(vscode.commands.registerCommand('ege.setup-global', () => {
		EGE.instance().performInstall();
	}));

	context.subscriptions.push(vscode.commands.registerCommand('ege.build-and-run-current-file', (runPath) => {
		/// Watch the file and trigger build when changed.
		let fileToRun = runPath;
		if (!fileToRun) {
			fileToRun = vscode.window.activeTextEditor.document.fileName;
		}

		if (fs.existsSync(fileToRun)) {
			/// perform build and run
		} else {
			vscode.window.showErrorMessage("EGE: Failed to to build ")
		}
	}));

	context.subscriptions.push(vscode.commands.registerCommand('ege.cleanup-caches', () => {
		EGE.instance().clearPluginCache();
	}));

	context.subscriptions.push(vscode.commands.registerCommand('ege.open-cache-dir', () => {
		if (EGE.instance().egeInstallerDir && fs.existsSync(EGE.instance().egeInstallerDir)) {
			utils.openDirectoryInFileExplorer(EGE.instance().egeInstallerDir);
		} else {
			vscode.window.showErrorMessage(`EGE: Cache dir ${EGE.instance().egeInstallerDir} does not exist.`)
		}
	}));
}

// this method is called when your extension is deactivated
function deactivate() {
	/// cleanup
	EGE.unregister();
}

module.exports = {
	activate,
	deactivate
}
