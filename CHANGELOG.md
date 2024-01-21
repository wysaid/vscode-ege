# Change Log

All notable changes to the "ege" extension will be documented in this file.

Check [Keep a Changelog](http://keepachangelog.com/) for recommendations on how to structure this file.

## 0.3.6

- 修正：使用 CMake 构建项目，运行时中文乱码(源文件字符集 UTF-8，系统字符集 ANSI，Windows MSVC)

## 0.3.5

- 优化内置ege编码方式, 避免警告.
- 优化编译文件的 encoding, 支持 utf8 格式的源文件, 避免中文乱码

## 0.3.4

- 优化 launch tasks.

## 0.3.3

- 解决 windows 下补全的 `tasks` 会依赖 `git-bash` 的问题, 改用 cmd 指令重写

## 0.3.2

- 修正打包问题

## 0.3.1

- 解决 CMake 项目生成在 Windows 下的一些问题. 已处于可用状态.

## 0.3.0

- 解决 CMake 项目生成的问题, 内置一个 CMake 的模板.

## 0.2.2

- 弹窗提示翻译为中文.
- Windows 版的单文件运行功能, 默认依附于 vscode 的 terminal 运行.
- 当检查到代码中存在 cin/cout/printf/scanf 之类的标准输入输出的时候, 给加上 SHOW_CONSOLE 参数

## 0.2.1

- 单文件编译支持 debian/ubuntu, 同时内置对应的静态库.

## 0.2.0

- 重构基本代码结构, 将大量的 callback 传入参数改为 async/await.
- 基于 wine64 + mingw-w64, 支持 MacOS 编译以及运行.

## 0.1.6

- Support paths with space

## 0.1.5

- Fix running cwd.

## 0.1.4

- Fix missing modules.

## 0.1.3

- Fix command err.

## 0.1.2

- Support build&run without `setup-global` command.

## 0.1.0

- Support `Build & Run single cpp file`. Tested platform: `vs2019`, `vs2022`

## 0.0.5

- Support build and run

## 0.0.4

- Support builtin bundle.

## 0.0.3

- Beta:
  - Support installation of `VS2015/VS2017/VS2019/VS2022`

## 0.0.2

- Draft:
  - Support ege installers downloading & unzipping.
  - Support cache manage.

## 0.0.1

- Initial release
