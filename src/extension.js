// @ts-nocheck
// @ts-nocheck
// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
'use strict';

const vscode = require('vscode');
const EGE = require('./ege')

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

		// if (!progressHandle) {

		// 	progressHandle.start("ege: setup-global!!\n", "ege");
		// } else {
		// 	progressHandle.cancel();
		// 	progressHandle = null;
		// }
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
