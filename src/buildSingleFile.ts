/**
 * @author: wysaid
 * Date: 2022-1-25
 */

import { SingleFileBuilder } from "./SingleFileBuilder";
import { SingleFileBuilderUnix } from "./buildSingleFileUnix";
import { SingleFileBuilderWin32 } from "./buildSingleFileWin32";
import { ege } from "./ege";
import { isDebian, isMacOS, isWindows } from "./utils";

/// 编译单个文件

let egeBuilderInstance: SingleFileBuilder | undefined;


export function singleFileBuilderInstance(): SingleFileBuilder {
    if (!egeBuilderInstance) {
        if (isWindows()) {
            egeBuilderInstance = new SingleFileBuilderWin32();
        } else if (isMacOS() || isDebian()) {
            egeBuilderInstance = new SingleFileBuilderUnix();
        } else {
            ege.printError("EGE: Unsupported platform!");
            throw new Error("Unsupported platform!");
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