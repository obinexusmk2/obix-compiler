import type { Diagnostic, DopIR, A11yModel, EmitMode } from "@obinexusltd/obix-spec";
export interface CompileOptions {
    path?: string;
    mode?: EmitMode;
    irImport?: string;
}
export interface CompileResult {
    ok: boolean;
    ir?: DopIR;
    code?: string;
    a11y?: A11yModel;
    diagnostics: Diagnostic[];
}
export declare function compile(source: string, options?: CompileOptions): CompileResult;
//# sourceMappingURL=compile.d.ts.map