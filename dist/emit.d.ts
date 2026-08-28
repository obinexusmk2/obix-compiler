import type { DopIR, EmitMode, ObixScriptModel } from "@obinexusltd/obix-spec";
export interface EmitOptions {
    mode?: EmitMode;
    irImport?: string;
}
export declare function emitModule(ir: DopIR, script: ObixScriptModel, opts?: EmitOptions): string;
//# sourceMappingURL=emit.d.ts.map