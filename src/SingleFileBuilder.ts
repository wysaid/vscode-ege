/**
 * @author: wysaid
 * Date: 2022-1-25
 */

/// 编译单个文件

export abstract class SingleFileBuilder {
    constructor() {
    }

    abstract buildCurrentActiveFile(fileToRun: string): Promise<void>;
    abstract release(): void;
}