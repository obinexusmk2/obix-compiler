import { readFileSync } from "node:fs";
import { compile } from "./compile.js";
export { compile } from "./compile.js";
export { emitModule } from "./emit.js";
export { buildIR } from "./ir.js";
export function compileFile(path, options = {}) {
    const source = readFileSync(path, "utf8").replace(/\r\n/g, "\n");
    return compile(source, { ...options, path });
}
export function checkSource(source, path) {
    const result = compile(source, { path });
    return { ok: result.ok, diagnostics: result.diagnostics };
}
//# sourceMappingURL=index.js.map