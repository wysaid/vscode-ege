/**
 * @author: wysaid
 * Date: 20231210
 */

import { SingleFileBuilder } from "./buildSingleFile";

export class SingleFileBuilderUnix extends SingleFileBuilder {



    constructor() {
        super();
    }

    buildCurrentActiveFile(_: string): void {
        throw new Error("Method not implemented.");
    }

    release(): void {
        throw new Error("Method not implemented.");
    }

}