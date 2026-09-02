import { type CompileOptions, type CompileResult } from "./compile.js";
export { compile } from "./compile.js";
export type { CompileOptions, CompileResult } from "./compile.js";
export { emitModule } from "./emit.js";
export { buildIR } from "./ir.js";
export declare function compileFile(path: string, options?: Omit<CompileOptions, "path">): CompileResult;
export declare function checkSource(source: string, path?: string): {
    ok: boolean;
    diagnostics: import("obix-spec").Diagnostic[];
};
//# sourceMappingURL=index.d.ts.map