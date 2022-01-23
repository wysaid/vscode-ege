// @ts-nocheck
/**
 * Author: wysaid
 * Date: 2022-1-23
 */
'use strict';

/// hard code to detect compilers

const vscode = require('vscode');
const childProcess = require('child_process');
const os = require('os');
const path = require('path');
const fs = require('fs-extra');
const mergeDirs = require('merge-dirs').default;
const utils = require('./utils')

class Compilers {

    /// Only cb's latest version.
    TYPE_CODE_BLOCKS = 'codeblocks20.03';
    TYPE_DEV_CPP = 'devcpp';
    TYPE_MINGW64 = 'mingw64';
    TYPE_VS2015 = 'vs2015';
    TYPE_VS2017 = 'vs2017';
    TYPE_VS2019 = 'vs2019';
    TYPE_VS2022 = 'vs2022';

    /// will try auto detect.
    TYPE_LATEST_VISUAL_STUDIO = 'vs_latest';

    choosedCompiler = null;
    onCompleteCallback = null;

    compilerIncludeDir = null;
    compilerLibsDir = null;

    installerIncludePath = null;
    installerLibsPath = null;

    visualStudioVersion = 0;

    constructor() {
    }

    chooseCompilerByUser() {
        const platformName = os.platform();
        if (platformName !== 'win32' && platformName !== 'cygwin') { /// 目前仅支持 windows
            vscode.window.showErrorMessage(`ege: Platform ${platformName} is not supported by now!`);
            return null;
        }

        /// this.TYPE_LATEST_VISUAL_STUDIO, this.TYPE_VS2022, this.TYPE_VS2019, this.TYPE_VS2017, this.TYPE_VS2015, 
        let quickPickTitle = [this.TYPE_DEV_CPP, this.TYPE_MINGW64, this.TYPE_CODE_BLOCKS];

        const vswhere = 'C:/Program Files (x86)/Microsoft Visual Studio/Installer/vswhere.exe';
        if (fs.existsSync(vswhere)) {
            /// try to find installed visual studio
            let output = childProcess.execSync(`"${vswhere}" -property installationPath`);
            if (output) {
                const arrOutput = output.toString().split(os.EOL);
                if (arrOutput && arrOutput.length > 0) {
                    if (arrOutput[arrOutput.length - 1].length === 0) {
                        --arrOutput.length;
                    }

                    quickPickTitle = arrOutput.concat(quickPickTitle);
                    console.log("ege: find installed visual studio path: " + output);
                }
            }
        }

        this.choosedCompiler = null;
        return vscode.window.showQuickPick(quickPickTitle, {
            title: "ege: Choose the specific compiler to install.",
            canPickMany: false,
            // matchOnDescription: this.TYPE_LATEST_VISUAL_STUDIO
        });
    }

    performInstall(type, installationPath, onComplete) {

        if (type) {
            this.choosedCompiler = type;
        }

        this.onCompleteCallback = onComplete;

        switch (this.choosedCompiler) {
            case this.TYPE_VS2015:
            case this.TYPE_VS2017:
            case this.TYPE_VS2019:
            case this.TYPE_VS2022:
            case this.TYPE_LATEST_VISUAL_STUDIO:
                this.performInstallVisualStudio(installationPath);
                break;
            case this.TYPE_DEV_CPP:
                this.performInstallDevCpp();
            case this.TYPE_CODE_BLOCKS:
                this.performInstallCodeBlocks();
                break;
            case this.TYPE_MINGW64:
                this.performInstallMinGW64();
                break;
            default:
                vscode.window.showInformationMessage("ege: Compiler choosed: " + this.choosedCompiler);
                this.performInstallVisualStudio(installationPath);
                break;
        }
    }

    DIR_INCLUDE = 'include';
    DIR_LIBS = 'lib';

    /**
     * @param {string} dir 
     */
    guessCppEnvPath(dir) {
        let dirToGuess = dir;
        let guessedIncludeDir = null;
        let guessedLibsDir = null;

        /// vs2015: C:\Program Files (x86)\Microsoft Visual Studio 14.0\VC
        /// vs2017&vs2019: C:\Program Files (x86)\Microsoft Visual Studio\20XX\<Community|Profeccsional|Enterprise>\VC\Tools\MSVC\<VersionNumber>\include
        /// vs2022: C:\Program Files\Microsoft Visual Studio\2022\<Community|Profeccsional|Enterprise>\VC\Tools\MSVC\<VersionNumber>\include

        if (dirToGuess.indexOf("Microsoft Visual Studio 14.0") > 0) {
            /// vs 2015 did not need to guess.
            dirToGuess = path.join(dir, "VC");
            guessedIncludeDir = path.join(dirToGuess, 'include');
            guessedLibsDir = path.join(dirToGuess, 'lib');
            this.visualStudioVersion = 2015
        } else {
            /// vs2022+
            const vsMark = 'Microsoft Visual Studio';
            const vsMarkIndex = dirToGuess.indexOf(vsMark);
            if (vsMarkIndex > 0) {
                /// get version: 20xx
                const indexStart = vsMarkIndex + vsMark.length + 1;
                const versionString = dirToGuess.substring(indexStart, indexStart + 4);
                console.log("Find visual studio " + versionString);
                this.visualStudioVersion = parseInt(versionString);
            }

            dirToGuess = path.join(dir, 'VC/Tools/MSVC');

            /// different vs build.
            let buildVerContent = fs.readdirSync(dirToGuess);
            let buildVerString = null;

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

        if (fs.existsSync(guessedIncludeDir) && fs.existsSync(guessedLibsDir)) {
            /// Guess right!
            console.log(`Find include dir: ${guessedIncludeDir}, and lib dir: ${guessedLibsDir}`);
            this.compilerIncludeDir = guessedIncludeDir;
            this.compilerLibsDir = guessedLibsDir;
        } else {
            this.compilerIncludeDir = null;
            this.compilerLibsDir = null;
        }

    }

    performInstallVisualStudio(egeInstallerDir) {
        if (fs.existsSync(this.choosedCompiler)) {
            /// User specified dir. May be some version of visual studio.
            this.guessCppEnvPath(this.choosedCompiler);

            if (this.compilerIncludeDir && this.compilerLibsDir) {
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

                    /// perform copy include dir!
                    try {
                        mergeDirs(this.installerIncludePath, this.compilerIncludeDir);
                        mergeDirs(this.installerLibsPath, this.compilerLibsDir);
                    } catch (e) {
                        console.log("mergeDir failed: " + e);
                        /// Maybe no permission. try copy it by users themselves.
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
                        return;
                    }

                    this.validateInstallation();
                } else {
                    vscode.window.showErrorMessage(`ege: Invalid dir ${this.installerIncludePath} or ${srcLibsDir}`);
                }
            }
        }
    }

    performCopyByUser(packageDir) {
        {
            const batchFileContent = `
echo "Run as admin, or you can run the commnad below by yourself."

xcopy "${packageDir}/include" "${this.compilerIncludeDir}" /e /d /y /h /r /c
xcopy "${packageDir}/lib" "${this.compilerLibsDir}" /e /d /y /h /r /c

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
        之后粘贴至 "${this.compilerIncludeDir}" 目录, 选择覆盖。 如果提示需要管理员权限, 请直接确认.
    2. 复制 "${packageDir}/lib" 目录下的所有内容 (注意, 不是复制此 lib 目录)
        之后粘贴至 "${this.compilerLibsDir}" 目录, 选择覆盖。 如果提示需要管理员权限, 请直接确认.
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

    validateInstallation() {
        /// Check `graphics.h`
        if (fs.existsSync(path.join(this.compilerIncludeDir, 'graphics.h') && fs.existsSync(path.join(this.compilerIncludeDir, 'ege.h')))) {
            vscode.window.showInformationMessage("ege: Finish installation, dst include dir: " + this.compilerIncludeDir);
        } else {
            vscode.window.showErrorMessage("ege: Install failed! EGE Headers not found at: " + this.compilerIncludeDir);
        }

        const libsDirArray = [
            'graphics.lib',
            'amd64/graphics.lib',
            'amd64/graphics.lib',
            'x86/graphics.lib',
            'x64/graphics.lib',
        ];

        let findedLibs = new Array();

        libsDirArray.forEach(name => {
            const libPath = path.join(this.installerLibsPath, name);
            if (fs.existsSync(libPath)) {
                findedLibs.push(libPath);
            }
        });

        if (findedLibs.length !== 0) {
            vscode.window.showInformationMessage("ege: Finish installation, dst libs: " + findedLibs.join(';'));
        } else {
            vscode.window.showErrorMessage("ege: Install failed! EGE libraries not found at: " + this.compilerIncludeDir);
        }
    }

    reportNotSupported() {
        vscode.window.showErrorMessage("ege: Not supported by now! (Only Visual Studio is supported by now)");
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

module.exports = Compilers;