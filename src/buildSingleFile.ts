/**
 * @author: wysaid
 * Date: 2022-1-25
 */

import { SingleFileBuilder } from "./SingleFileBuilder";
import { SingleFileBuilderWin32 } from "./buildSingleFileWin32";

/// 编译单个文件

let egeBuilderInstance: SingleFileBuilder | undefined;


export function singleFileBuilderInstance(): SingleFileBuilder {
    if (!egeBuilderInstance) {
        if (process.platform === 'win32') {
            egeBuilderInstance = new SingleFileBuilderWin32();
        } else {
            throw new Error("EGE: Unsupported platform: " + process.platform);
        }
    }
    return egeBuilderInstance;
}

export function unregisterSingleFileBuilder(): void {
    egeBuilderInstance?.release?.();
    egeBuilderInstance = undefined;
}

export function buildCurrentActiveFile(fileToRun: string): Promise<void> {
    return singleFileBuilderInstance().buildCurrentActiveFile(fileToRun);
}