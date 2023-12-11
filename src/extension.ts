// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below

import vscode = require('vscode');
import fs = require('fs-extra');
import { EGEInstaller } from './installer';
import { buildCurrentActiveFile, unregisterSingleFileBuilder } from './buildSingleFile';

import utils = require('./utils')
import { ege } from './ege';

function activate(context: vscode.ExtensionContext) {

	// Use the console to output diagnostic information (console.log) and errors (console.error)
	// This line of code will only be executed once when your extension is activated
	console.log('Congratulations, your extension "ege" is now active!');

	EGEInstaller.registerContext(context);

	context.subscriptions.push(vscode.commands.registerCommand('ege.setupProject', () => {
		vscode.window.showInformationMessage("EGE: Setup-project not implemented. Do it later...\n");
	}));

	context.subscriptions.push(vscode.commands.registerCommand('ege.setupGlobal', () => {
		EGEInstaller.instance().performInstall();
	}));

	context.subscriptions.push(vscode.commands.registerCommand('ege.buildAndRunCurrentFile', async (runPath) => {
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

		const egeInstance = EGEInstaller.instance();

		if (fs.existsSync(fileToRun)) {
			/// perform build and run

			if (egeInstance) {
				if (!utils.validateInstallationOfDirectory(egeInstance.egeInstallerDir)) {
					ege.showWarningBox(`EGE没有初始化过, 正在执行初始化, 初始化完毕之后请重试...`, "哦");
					/// 没有执行过安装, 执行一次.
					egeInstance.egeDownloadedZipFile = undefined;
					if (await egeInstance.performInstall()) {
						await buildCurrentActiveFile(fileToRun);
					}

					if (!utils.validateInstallationOfDirectory(egeInstance.egeInstallerDir)) {
						ege.printError(`解压文件失败!!! 请检查网络连接, 也可以手动下载: ${egeInstance.egeDownloadUrl} 并解压到 ${egeInstance.egeInstallerDir}`);
					} else {
						await buildCurrentActiveFile(fileToRun);
					}
				} else {
					await buildCurrentActiveFile(fileToRun);
				}
			}
		} else {
			if (fileToRun) {
				ege.showErrorBox("编译失败: 找不到文件 " + fileToRun);
			} else {
				ege.showErrorBox("编译失败: 未选中任何文件!");
			}
		}
	}));

	context.subscriptions.push(vscode.commands.registerCommand('ege.cleanupCaches', () => {
		EGEInstaller.instance().clearPluginCache();
	}));

	context.subscriptions.push(vscode.commands.registerCommand('ege.openCacheDir', () => {
		if (EGEInstaller.instance().egeInstallerDir && fs.existsSync(EGEInstaller.instance().egeInstallerDir)) {
			utils.openDirectoryInFileExplorer(EGEInstaller.instance().egeInstallerDir);
		} else {
			vscode.window.showErrorMessage(`EGE: Cache dir ${EGEInstaller.instance().egeInstallerDir} does not exist.`)
		}
	}));
}

// this method is called when your extension is deactivated
function deactivate() {
	/// cleanup
	EGEInstaller.unregister();
	unregisterSingleFileBuilder();
}

module.exports = {
	activate,
	deactivate
}
