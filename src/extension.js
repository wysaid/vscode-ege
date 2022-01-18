// @ts-nocheck
// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
'use strict';

const vscode = require('vscode');
// const fs = require('fs-extra');
// const path = require('path');

/**
 * @param {vscode.ExtensionContext} context
 */
function activate(context) {

	// Use the console to output diagnostic information (console.log) and errors (console.error)
	// This line of code will only be executed once when your extension is activated
	console.log('Congratulations, your extension "ege" is now active!');

	context.subscriptions.push(vscode.commands.registerCommand('ege.setup-project', () => {
		vscode.window.showInformationMessage("ege: setup-project!!\n");
	}));

	context.subscriptions.push(vscode.commands.registerCommand('ege.setup-global', () => {
		vscode.window.showInformationMessage("ege: setup-global!!\n");
	}));
}

// this method is called when your extension is deactivated
function deactivate() {
	/// cleanup
}

module.exports = {
	activate,
	deactivate
}
