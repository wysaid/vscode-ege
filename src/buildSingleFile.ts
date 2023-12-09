/**
 * Author: wysaid
 * Date: 2022-1-25
 */

import { SingleFileBuilderWin32 } from "./buildSingleFileWin32";

/// 编译单个文件

export abstract class SingleFileBuilder {

    static egeBuilderInstance?: SingleFileBuilder;

    static instance(): SingleFileBuilder {
        if (!SingleFileBuilder.egeBuilderInstance) {
            if (process.platform === 'win32') {
                SingleFileBuilder.egeBuilderInstance = new SingleFileBuilderWin32();
            } else {
                throw new Error("EGE: Unsupported platform: " + process.platform);
            }
        }
        return SingleFileBuilder.egeBuilderInstance;
    }

    static unregister(): void {
        SingleFileBuilder.egeBuilderInstance?.release?.();
        SingleFileBuilder.egeBuilderInstance = undefined;
    }

    constructor() {
    }

    abstract buildCurrentActiveFile(fileToRun: string): void; 
    abstract release(): void;
}