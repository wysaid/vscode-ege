// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below

import vscode = require('vscode');
import fs = require('fs-extra');
import EGE = require('./ege');
import SingleFileBuilder = require('./buildSingleFile');

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

	context.subscriptions.push(vscode.commands.registerCommand('ege.setupProject', () => {
		vscode.window.showInformationMessage("EGE: Setup-project not implemented. Do it later...\n");
	}));

	context.subscriptions.push(vscode.commands.registerCommand('ege.setupGlobal', () => {
		EGE.instance().performInstall();
	}));

	context.subscriptions.push(vscode.commands.registerCommand('ege.buildAndRunCurrentFile', (runPath) => {
		/// Watch the file and trigger build when changed.
		let fileToRun = runPath;
		if (!fileToRun || !fs.existsSync(fileToRun)) {
			fileToRun = vscode.window.activeTextEditor?.document?.fileName;
			if (!fs.existsSync(fileToRun)) {
				/// May focus tasks.
				const editors = vscode.window.visibleTextEditors;
				if (editors && editors.length > 0) {
					/// Choose the first editor.
					for (const e in editors) {
						const name = editors[e].document.fileName;
						if (fs.existsSync(name)) {
							fileToRun = name;
							break;
						}
					}
				}
			}
		}

		/**
		 * @type {EGE}
		 */
		const egeInstance = EGE.instance();

		/**
		 * @type {SingleFileBuilder}
		 */
		const builder = SingleFileBuilder.instance();

		if (fs.existsSync(fileToRun)) {
			/// perform build and run

			if (egeInstance) {
				if (!utils.validateInstallationOfDirectory(egeInstance.egeInstallerDir)) {
					vscode.window.showWarningMessage("EGE: No installation found, performing initialization. Please try again...");
					/// 没有执行过安装, 执行一次.
					egeInstance.egeDownloadedZipFile = egeInstance.egeBundledZip;
					egeInstance.performUnzip((err) => {
						if (err) {
							vscode.window.showErrorMessage("EGE: perform unzip failed: " + err);
						} else {
							builder?.buildCurrentActiveFile(fileToRun);
						}
					});
				} else {
					builder?.buildCurrentActiveFile(fileToRun);
				}
			}
		} else {
			if (fileToRun) {
				vscode.window.showErrorMessage("EGE: Failed to to build: Can not find file " + fileToRun);
			} else {
				vscode.window.showErrorMessage("EGE: Failed to to build: No active file selected!");
			}
		}
	}));

	context.subscriptions.push(vscode.commands.registerCommand('ege.cleanupCaches', () => {
		EGE.instance().clearPluginCache();
	}));

	context.subscriptions.push(vscode.commands.registerCommand('ege.openCacheDir', () => {
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
	SingleFileBuilder.unregister();
}

module.exports = {
	activate,
	deactivate
}
