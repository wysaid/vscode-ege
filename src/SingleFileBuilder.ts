/**
 * @author: wysaid
 * Date: 2022-1-25
 */

import * as fs from "fs-extra";

/// 编译单个文件

export abstract class SingleFileBuilder {
    constructor() {
    }

    abstract buildCurrentActiveFile(fileToRun: string): Promise<void>;
    abstract release(): void;
}

export function getCppShowConsoleDefine(cppFile: string): string | undefined {
    const defineMacro = "SHOW_CONSOLE";
    const defineContent = `#define ${defineMacro}`;
    const content = fs.readFileSync(cppFile, { encoding: "utf-8" });

    if (content.indexOf(defineContent) >= 0) {
        return;
    }

    /// 读取这个 cppFile, 涉及 C/C++ 标准库输出的函数, 只要用了, 就应该显示控制台.

    /// 下面的正则表达式是 GPT4 基于 ["printf", "scanf", "getchar", "getch", "getche", "puts", "putchar", "putch", "putche", "cout", "cin", "cerr", "clog"] 生成
    const reg2 = new RegExp(`\\b(p(ut(s|(ch(e)?|ar)?)|rintf)|c(err|out|in|log)|g(et(ch(e|ar)?|che)?))\\b`, "g");
    if (reg2.test(content)) {
        return defineMacro;
    }
}