/**
 * Author: wysaid
 * Date: 2022-1-23
 */
/// hard code to detect compilers

import vscode = require('vscode');
import childProcess = require('child_process');
import os = require('os');
import path = require('path');
import fs = require('fs-extra');
import utils = require('./utils');
import glob = require('glob');

const VS_WHERE = 'C:/Program Files (x86)/Microsoft Visual Studio/Installer/vswhere.exe';

/// Only cb's latest version.
const TYPE_CODE_BLOCKS = 'codeblocks20.03 (待开发, 暂不支持)';
const TYPE_DEV_CPP = 'devcpp (待开发, 暂不支持)';
const TYPE_MINGW64 = 'mingw64 (待开发, 暂不支持)';
const TYPE_VS2015 = 'vs2015';
const TYPE_VS2017 = 'vs2017';
const TYPE_VS2019 = 'vs2019';
const TYPE_VS2022 = 'vs2022';

/// will try auto detect.
const TYPE_LATEST_VISUAL_STUDIO = 'vs_latest';

class ItemEnv {
    include: string | null = null;
    lib: string | null = null;
    version: number = 0;
};

export class CompilerItem {

    label: string;
    description: string | undefined;

    path: string;
    isValid: boolean = false;

    includeDir: string | null = null;
    libDir: string | null = null;

    /// will be 0 if not visual studio
    version = 0;

    activeBuildCommandTool: string | undefined;

    constructor(path: string) {
        /// parse value from path
        this.label = path;
        this.path = path;
        const ret = this.guessCompilerEnvPath(path);
        if (ret) {
            this.includeDir = ret.include;
            this.libDir = ret.lib;
            this.version = ret.version;
        }

        if (this.version !== 0) {
            this.description = `Microsoft Visual Studio ${this.version}`;
        }
    }

    guessCompilerEnvPath(dir: string): ItemEnv | null {

        let dirToGuess = dir;
        let guessedIncludeDir = "";
        let guessedLibsDir = "";
        let guessedVSVer = 0;

        /// vs2015: C:\Program Files (x86)\Microsoft Visual Studio 14.0\VC
        /// vs2017&vs2019: C:\Program Files (x86)\Microsoft Visual Studio\20XX\<Community|Profeccsional|Enterprise>\VC\Tools\MSVC\<VersionNumber>\include
        /// vs2022: C:\Program Files\Microsoft Visual Studio\2022\<Community|Profeccsional|Enterprise>\VC\Tools\MSVC\<VersionNumber>\include

        const vsMark = 'Microsoft Visual Studio';
        const vsMarkIndex = dirToGuess.indexOf(vsMark);

        if (vsMarkIndex > 0) {
            if (dirToGuess.indexOf("Microsoft Visual Studio 14.0") > 0) {
                /// vs 2015 did not need to guess.
                dirToGuess = path.join(dir, "VC");
                guessedIncludeDir = path.join(dirToGuess, 'include');
                guessedLibsDir = path.join(dirToGuess, 'lib');
                // this.visualStudioVersion = 2015
                guessedVSVer = 2015;
            } else {
                /// vs2022+

                if (vsMarkIndex > 0) {
                    /// get version: 20xx
                    const indexStart = vsMarkIndex + vsMark.length + 1;
                    const versionString = dirToGuess.substring(indexStart, indexStart + 4);
                    console.log("Find visual studio " + versionString);
                    guessedVSVer = parseInt(versionString);
                    // this.visualStudioVersion = parseInt(versionString);
                }

                dirToGuess = path.join(dir, 'VC/Tools/MSVC');

                if (fs.existsSync(dirToGuess)) {
                    /// different vs build.
                    let buildVerContent = fs.readdirSync(dirToGuess);
                    let buildVerString = "";

                    if (buildVerContent.length > 0) {
                        if (buildVerContent.length > 1) {
                            buildVerContent = buildVerContent.map(a => a.split('.').map(n => +n + 100000).join('.')).sort()
                                .map(a => a.split('.').map(n => +n - 100000).join('.'));
                        }
                        buildVerString = buildVerContent[buildVerContent.length - 1];
                    }

                    dirToGuess = path.join(dirToGuess, buildVerString);
                    guessedIncludeDir = path.join(dirToGuess, 'include');
                    guessedLibsDir = path.join(dirToGuess, 'lib');
                }
            }
        }

        if (fs.existsSync(guessedIncludeDir) && fs.existsSync(guessedLibsDir)) {
            /// Guess right!
            console.log(`Find include dir: ${guessedIncludeDir}, and lib dir: ${guessedLibsDir}`);
            return {
                include: guessedIncludeDir,
                lib: guessedLibsDir,
                version: guessedVSVer
            };
        } else {
            return null;
        }
    }

    getBuildCommandTool(): string | null {
        /// vcvarsall.bat, vcvars32.bat, vcvars64.bat...
        if (!this.path || !fs.existsSync(this.path)) {
            return null;
        }

        if (!this.activeBuildCommandTool) {
            let lessPath = path.join(this.path, 'VC');
            if (!fs.existsSync(lessPath)) {
                lessPath = this.path;
            }

            const tools = glob.sync('**/vcvarsall.bat', { cwd: lessPath });
            if (tools && tools.length > 0) {
                console.log('EGE: Find build command: ' + tools.join(';'));
            }
            this.activeBuildCommandTool = path.join(lessPath, tools[0]);
        }
        return this.activeBuildCommandTool;
    }

}

export class Compilers {

    static CompilerItem = CompilerItem;

    onCompleteCallback: null | undefined | Function;

    installerIncludePath: string | null = null;
    installerLibsPath: string | null = null;

    visualStudioVersion: number = 0;

    compilers: CompilerItem[] | undefined;

    selectedCompiler: CompilerItem | null = null;

    extensionContext: vscode.ExtensionContext;

    constructor(context: vscode.ExtensionContext) {
        this.extensionContext = context;
    }

    chooseCompilerByUser() {
        const platformName = os.platform();
        if (platformName !== 'win32' && platformName !== 'cygwin') { /// 目前仅支持 windows
            vscode.window.showErrorMessage(`EGE: Platform ${platformName} is not supported by now!`)
            console.log(`EGE: Platform ${platformName} is not supported by now!`);
            return null;
        }

        const comp = this.detectCompiler();

        return vscode.window.showQuickPick(comp, {
            title: "EGE: Choose the specific compiler to install.",
            canPickMany: false,
            // matchOnDescription: TYPE_LATEST_VISUAL_STUDIO
        });
    }

    setCompiler(compiler?: CompilerItem) {
        if (compiler && this.compilers && this.compilers.indexOf(compiler) >= 0) {
            this.selectedCompiler = compiler;
        } else {
            this.selectedCompiler = null;
            if (compiler != null) {
                vscode.window.showErrorMessage("EGE: Unrecognized compiler " + (compiler ? compiler.path : ""));
            }
        }
    }

    detectCompiler(): CompilerItem[] {
        if (this.compilers == null || this.compilers.length === 0) {
            this.compilers = [];

            if (fs.existsSync(VS_WHERE)) {
                /// try to find installed visual studio
                let output = childProcess.execSync(`"${VS_WHERE}" -property installationPath`);
                if (output) {
                    const arrOutput = output.toString().split(os.EOL);
                    if (arrOutput && arrOutput.length > 0) {
                        if (arrOutput[arrOutput.length - 1].length === 0) {
                            --arrOutput.length;
                        }

                        arrOutput.forEach(v => {
                            (this.compilers as Array<CompilerItem>).push(new CompilerItem(v));
                        });

                        console.log("EGE: Find installed visual studio path: " + output);
                    }
                }
            }

            const quickPickTitle = [TYPE_DEV_CPP, TYPE_MINGW64, TYPE_CODE_BLOCKS];
            quickPickTitle.forEach(v => {
                (this.compilers as Array<CompilerItem>).push(new CompilerItem(v));
            });
            this.compilers.map((value: CompilerItem, index: number) => {
                value.label = `${index}. ${value.label}`;
                return value;
            });
        }
        return this.compilers;
    }

    performInstall(selectedCompiler: CompilerItem, installationPath: string, onComplete?: Function) {

        if (selectedCompiler) {
            this.selectedCompiler = selectedCompiler;
        }

        this.onCompleteCallback = onComplete;

        switch ((this.selectedCompiler as CompilerItem).path) {
            case TYPE_VS2015:
            case TYPE_VS2017:
            case TYPE_VS2019:
            case TYPE_VS2022:
            case TYPE_LATEST_VISUAL_STUDIO:
                this.performInstallVisualStudio(installationPath);
                break;
            case TYPE_DEV_CPP:
                this.performInstallDevCpp();
            case TYPE_CODE_BLOCKS:
                this.performInstallCodeBlocks();
                break;
            case TYPE_MINGW64:
                this.performInstallMinGW64();
                break;
            default:
                vscode.window.showInformationMessage("EGE: Compiler choosed: " + (this.selectedCompiler as CompilerItem).path);
                this.performInstallVisualStudio(installationPath);
                break;
        }
    }

    performInstallVisualStudio(egeInstallerDir: string) {
        const c = this.selectedCompiler as CompilerItem;
        if (fs.existsSync(c.path)) {
            /// User specified dir. May be some version of visual studio.

            if (!c) {
                console.error("No compiler selected!");
                return;
            }

            if (!c.includeDir || !c.libDir) {
                c.guessCompilerEnvPath(c.path);
            }

            const installerIncludePath = this.installerIncludePath as string;

            if (c.includeDir && c.libDir) {
                this.installerIncludePath = path.join(egeInstallerDir, 'include');
                const srcLibsDir = path.join(egeInstallerDir, 'lib');
                if (fs.existsSync(this.installerIncludePath) && fs.existsSync(srcLibsDir)) {

                    this.installerLibsPath = path.join(srcLibsDir, 'vs' + this.visualStudioVersion);
                    if (!fs.existsSync(this.installerLibsPath)) {
                        /// 此版本不存在, 尝试获取一个最接近的版本.

                        let libDirContent = fs.readdirSync(srcLibsDir);
                        libDirContent = libDirContent.filter(a => a.indexOf('vs') === 0).sort();
                        /// choose the latest one.
                        this.installerLibsPath = path.join(srcLibsDir, libDirContent[libDirContent.length - 1]);
                    }

                    /// No permission. Try copy it by users themselves.
                    const easyCopyDir = path.join(egeInstallerDir, '../CopyContent');
                    if (fs.existsSync(easyCopyDir)) {
                        fs.removeSync(easyCopyDir);
                    }

                    const tmpIncludeDir = path.join(easyCopyDir, 'include');
                    const tmpLibsDir = path.join(easyCopyDir, 'lib');
                    fs.mkdirpSync(tmpIncludeDir);
                    fs.mkdirpSync(tmpLibsDir);
                    fs.copySync(this.installerIncludePath, tmpIncludeDir)
                    fs.copySync(this.installerLibsPath, tmpLibsDir);
                    this.performCopyByUser(easyCopyDir);
                } else {
                    vscode.window.showErrorMessage(`EGE: Invalid dir ${this.installerIncludePath} or ${srcLibsDir}`);
                }
            }
        }
    }

    performCopyByUser(packageDir: string) {
        const c = this.selectedCompiler as CompilerItem;

        {
            const batchFileContent = `
echo "Run as admin, or you can run the commnad below by yourself."

xcopy "${packageDir}/include" "${c.includeDir}" /e /d /y /h /r /c
xcopy "${packageDir}/lib" "${c.libDir}" /e /d /y /h /r /c

echo "Done!"
pause
`;
            const outputFile = path.join(packageDir, '请右键以管理员身份运行以完成EGE安装.bat');
            const outputSteam = fs.createWriteStream(outputFile, {
                encoding: 'utf8'
            });

            outputSteam.write(batchFileContent);
            outputSteam.close();
        }

        {
            const readmeContent = `
由于ege插件没有权限对编译器的相关目录进行写入, 所以选择如下任意方法:
1. 自动安装: 
    请使用管理员身份执行跟此文件同路径下的批处理脚本 "请右键以管理员身份运行以完成EGE安装.bat".
2. 手动安装:
    1. 复制 "${packageDir}/include" 目录下的所有内容 (注意, 不是复制此 include 目录)
        之后粘贴至 "${c.includeDir}" 目录, 选择覆盖。 如果提示需要管理员权限, 请直接确认.
    2. 复制 "${packageDir}/lib" 目录下的所有内容 (注意, 不是复制此 lib 目录)
        之后粘贴至 "${c.libDir}" 目录, 选择覆盖。 如果提示需要管理员权限, 请直接确认.
`;
            const readmeFile = path.join(packageDir, '请阅读此文件以完成后续安装.txt');
            const readmeStream = fs.createWriteStream(readmeFile, {
                encoding: 'utf8'
            });

            readmeStream.write('\ufeff');
            readmeStream.write(readmeContent);
            readmeStream.close();
        }

        utils.openDirectoryInFileExplorer(packageDir);
    }

    reportNotSupported() {
        vscode.window.showErrorMessage("EGE: Not supported by now! (Only Visual Studio is supported by now)");
    }

    performInstallDevCpp() {
        this.reportNotSupported();
    }

    performInstallCodeBlocks() {
        this.reportNotSupported();
    }

    performInstallMinGW64() {
        this.reportNotSupported();
    }
};

