/**
 * obix-compiler
 *
 * source -> sections -> AST -> semantic AST -> canonical DOP IR -> ES6 emit.
 *
 * Accessibility analysis (obix-accessibility) is a HARD, normal
 * dependency. It runs BEFORE emit and an a11y error blocks emit. There is no
 * supported mode equivalent to `--no-a11y`.
 */
import { readFileSync } from "node:fs";
import { compile, type CompileOptions, type CompileResult } from "./compile.js";

export { compile } from "./compile.js";
export type { CompileOptions, CompileResult } from "./compile.js";
export { emitModule } from "./emit.js";
export { buildIR } from "./ir.js";

/** Compile a `.obix` file from disk. */
export function compileFile(path: string, options: Omit<CompileOptions, "path"> = {}): CompileResult {
  const source = readFileSync(path, "utf8").replace(/\r\n/g, "\n");
  return compile(source, { ...options, path });
}

/** Diagnostics only (used by obix-language-server / obix-cli check). */
export function checkSource(source: string, path?: string) {
  const result = compile(source, { path });
  return { ok: result.ok, diagnostics: result.diagnostics };
}
