import type { DopIR, ObixScriptModel, TemplateDescriptor, A11yModel } from "@obinexusltd/obix-spec";
export interface BuildIROptions {
    name: string;
    script: ObixScriptModel;
    template: TemplateDescriptor;
    a11y: A11yModel;
    style: {
        token: string;
        css: string;
    };
}
export declare function buildIR(opts: BuildIROptions): DopIR;
//# sourceMappingURL=ir.d.ts.map