import { validateObixAST, DIAGNOSTIC_CODES, createScopeToken } from "obix-spec";
import type { Diagnostic, DopIR, A11yModel, ObixAST, EmitMode } from "obix-spec";
import { scanSections, parseTemplate, parseScript, parseStyles } from "obix-parser";
import { analyzeTemplate } from "obix-template";
import { scopeCss } from "obix-styles";
import { analyzeA11y, hasBlockingA11yError } from "obix-accessibility";
import { buildIR } from "./ir.js";
import { emitModule } from "./emit.js";

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

const PASCAL = /^[A-Z][A-Za-z0-9]*$/;

function componentNameFromPath(path: string | undefined): string {
  if (!path) return "Component";
  const base = path.replace(/\\/g, "/").split("/").pop() ?? "Component";
  return base.replace(/\.obix$/, "");
}

/**
 * source
 *   -> sections -> AST -> validateObixAST (structural seal)
 *   -> binding + event analysis
 *   -> accessibility analysis  (BEFORE emit — hard dependency, no --no-a11y)
 *   -> scoped CSS
 *   -> canonical DOP IR
 *   -> ES6 emit
 */
export function compile(source: string, options: CompileOptions = {}): CompileResult {
  const diagnostics: Diagnostic[] = [];
  const name = componentNameFromPath(options.path);

  if (!PASCAL.test(name)) {
    diagnostics.push({ code: DIAGNOSTIC_CODES.P008_BAD_COMPONENT_NAME, severity: "error", message: `component file must be PascalCase, got "${name}"` });
  }

  const scan = scanSections(source);
  diagnostics.push(...scan.diagnostics);

  const tpl = scan.sections.template ? parseTemplate(scan.sections.template.raw) : undefined;
  if (tpl) diagnostics.push(...tpl.diagnostics);

  const scr = scan.sections.script ? parseScript(scan.sections.script.raw) : undefined;
  if (scr) diagnostics.push(...scr.diagnostics);

  const styleRaw = scan.sections.style?.raw ?? "";
  const sty = parseStyles(styleRaw);
  diagnostics.push(...sty.diagnostics);

  const ast: ObixAST = {
    componentName: name,
    sections: scan.sections,
    template: tpl?.ast,
    script: scr?.model,
  };

  const structural = validateObixAST(ast);
  for (const v of structural.violations) {
    diagnostics.push({ code: DIAGNOSTIC_CODES.S005_PIPELINE_INVARIANT, severity: "error", message: `${v.rule}: ${v.message}` });
  }

  if (!tpl?.ast || !scr?.model || hasErrors(diagnostics)) {
    return { ok: false, diagnostics };
  }

  const template = analyzeTemplate(tpl.ast);

  // semantic checks: binding refs + event actions must be known
  const known = new Set<string>([
    ...scr.model.actionNames,
    ...scr.model.derivedNames,
    ...keysOf(scr.model.stateInit),
    ...keysOf(scr.model.propsInit),
  ]);
  for (const b of template.bindings) {
    for (const dep of b.deps) {
      if (!known.has(dep)) {
        diagnostics.push({ code: DIAGNOSTIC_CODES.S002_UNKNOWN_BINDING_REF, severity: "error", message: `binding "${b.expr}" references unknown name "${dep}"` });
      }
    }
  }
  for (const ev of template.events) {
    if (!scr.model.actionNames.includes(ev.action)) {
      diagnostics.push({ code: DIAGNOSTIC_CODES.S001_UNKNOWN_ACTION, severity: "error", message: `on:${ev.event} references unknown action "${ev.action}"` });
    }
  }

  // accessibility — runs before emit; errors block emit; there is no bypass
  const a11y = analyzeA11y(template);
  diagnostics.push(...a11y.diagnostics);
  if (hasBlockingA11yError(a11y.diagnostics)) {
    return { ok: false, a11y: a11y.model, diagnostics };
  }

  if (hasErrors(diagnostics)) {
    return { ok: false, a11y: a11y.model, diagnostics };
  }

  const token = createScopeToken(name, options.path);
  const scoped = scopeCss(styleRaw, token);
  diagnostics.push(...scoped.diagnostics);

  const ir = buildIR({
    name,
    script: scr.model,
    template,
    a11y: a11y.model,
    style: { token, css: scoped.css },
  });

  const code = emitModule(ir, scr.model, { mode: options.mode, irImport: options.irImport });

  return { ok: true, ir, code, a11y: a11y.model, diagnostics };
}

function hasErrors(d: Diagnostic[]): boolean {
  return d.some((x) => x.severity === "error");
}

function keysOf(objSrc: string | undefined): string[] {
  if (!objSrc) return [];
  const inner = objSrc.replace(/^\s*\{/, "").replace(/\}\s*$/, "");
  const keys: string[] = [];
  const re = /(?:^|,)\s*([A-Za-z_$][\w$]*)\s*:/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(inner)) !== null) keys.push(m[1]!);
  return keys;
}
