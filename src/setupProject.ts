/**
 * Author: wysaid
 * Date: 2023.12.12
 */

import * as vscode from 'vscode';
import * as fs from 'fs-extra';
import * as path from 'path';
import { ege } from './ege';


function copyIfNotExists(src: string, dst: string) {
    if (!fs.existsSync(dst)) {
        /// 如果中间目录不存在, 则创建
        const dstDir = path.dirname(dst);
        if (!fs.existsSync(dstDir)) {
            fs.mkdirpSync(dstDir);
        }
        fs.copyFileSync(src, dst);
        ege.printInfo(`${dst} 已创建!`);
    } else {
        ege.printInfo(`${dst} 已存在, 跳过创建!`);
    }
}

export function setupProject() {
    const workspaceFolders = vscode.workspace.workspaceFolders;

    for (const workspaceFolder of workspaceFolders || []) {
        /// 如果根目录没有 CMakeLists.txt, 拷贝一个过去
        const workspaceDir = workspaceFolder.uri.fsPath;
        const cmakeListsPath = vscode.Uri.file(`${workspaceDir}/CMakeLists.txt`);
        if (fs.existsSync(cmakeListsPath.fsPath)) {
            ege.printInfo("CMakeLists.txt 已存在!");
        } else {
            const cmakeListsTemplatePath = path.join(__dirname, "../cmake_template/CMakeLists.txt");
            fs.copyFileSync(cmakeListsTemplatePath, cmakeListsPath.fsPath);
            ege.printInfo("CMakeLists.txt 已创建!");

            /// 搜索一下项目目录下是否有别的 cpp 文件, 如果没有, 则拷贝 demo.cpp

            const files = fs.readdirSync(workspaceDir, { encoding: "utf-8" });
            let hasCppFile = false;
            for (const file of files) {
                if (file.endsWith(".cpp")) {
                    hasCppFile = true;
                    break;
                }
            }

            if (!hasCppFile) {
                /// 拷贝 demo.cpp
                copyIfNotExists(path.join(__dirname, "../cmake_template/demo.cpp"), `${workspaceDir}/demo.cpp`);
            } else {
                ege.printInfo("项目目录下已存在 cpp 文件, 跳过创建 demo.cpp!");
            }
        }

        /// 如果根目录没有 .vscode/settings.json, 拷贝一个过去
        copyIfNotExists(path.join(__dirname, "../cmake_template/.vscode/settings.json"), `${workspaceDir}/.vscode/settings.json`);

        /// 如果根目录没有 .vscode/tasks.json, 拷贝一个过去
        copyIfNotExists(path.join(__dirname, "../cmake_template/.vscode/tasks.json"), `${workspaceDir}/.vscode/tasks.json`);

        /// 如果根目录没有 .vscode/launch.json, 拷贝一个过去
        copyIfNotExists(path.join(__dirname, "../cmake_template/.vscode/launch.json"), `${workspaceDir}/.vscode/launch.json`);

        /// 如果根目录没有 .vscode/c_cpp_properties.json, 拷贝一个过去
        copyIfNotExists(path.join(__dirname, "../cmake_template/.vscode/c_cpp_properties.json"), `${workspaceDir}/.vscode/c_cpp_properties.json`);

        /// 如果根目录没有 ege 目录, 拷贝一个过去
        const egeDir = `${workspaceDir}/ege`;

        if (!fs.existsSync(egeDir)) {
            fs.mkdirpSync(egeDir);
            ege.printInfo("ege 目录已创建!");

            /// 拷贝整个 ege 目录
            const egeSrcDir = path.join(__dirname, "../bundle/ege_bundle");
            fs.copySync(egeSrcDir, egeDir);
        } else {
            ege.printInfo("ege 目录已存在, 跳过创建!");
        }
    }

    ege.getOutputChannel().show();
}