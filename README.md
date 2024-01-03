# VSCode Plugin for [Easy Graphics Engine](https://github.com/wysaid/xege)

A VSCode plugin to help the configuration of [ege](https://xege.org). Enjoy it!

## Features

- Generate `EGE Projects` with single click
- Build and run single cpp files with EGE support.(`graphics.h`)
- Add EGE CMake Project Template for `C/C++` source.
- Support MacOS/Linux (By `wine`)

## Deps

- Windows: Visual Studio 2017/2019/2022/20XX+
- MacOS: `mingw-w64`, `wine-stable` (wine64)
- Linux: `mingw-w64`, `wine64`

## Install

- Search `ege` in the Visual Studio Store.
- Get it at <https://marketplace.visualstudio.com/items?itemName=wysaid.ege>

## Extension Settings

You can define some options like below:

```jsonc
{
    /// The url to get latest version of EGE (default: https://xege.org/download/ege-latest-version)
    "ege.update_url": "", 
    "ege.showEditorContextMenu": true, // Show 'ege' in editor context menu
    "ege.explorerContextMenu": true, // Show 'ege' in explorer context menu
}
```

## MileStone

- Install:
  - Support ege downloading & install.

- Compiler:
  - Support vs2019 and later
  - Support MingW + GCC

- Solution:
  - Support single file compile & run
  - Support `Visual Studio` template generation.
  - Support CMake template generation.

- Platform:
  - Windows 10 and later
  - MacOS via WINE
