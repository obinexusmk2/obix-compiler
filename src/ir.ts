import { SPEC_VERSION, LEVEL } from "@obinexusltd/obix-spec";
import type {
  DopIR,
  ObixScriptModel,
  TemplateDescriptor,
  A11yModel,
  ActionSignature,
  DerivedSignature,
  EffectDescriptor,
} from "@obinexusltd/obix-spec";

export interface BuildIROptions {
  name: string;
  script: ObixScriptModel;
  template: TemplateDescriptor;
  a11y: A11yModel;
  style: { token: string; css: string };
}

/**
 * Assemble the canonical DOP IR (JSON-serialisable). This is the boundary:
 * nothing after here introduces or modifies business logic. DATA FIRST.
 */
export function buildIR(opts: BuildIROptions): DopIR {
  const { name, script, template, a11y, style } = opts;

  const stateShape = keysOf(script.stateInit);
  const propsShape = keysOf(script.propsInit);
  const mentions = (body: string, ident: string) => new RegExp(`\\b${ident}\\b`).test(body);

  const actionDecls: Record<string, ActionSignature> = {};
  for (const a of script.actionNames) {
    const body = script.members.actions[a] ?? "";
    const propDeps = propsShape.filter((p) => mentions(body, p));
    const usesProps = /\bprops\b/.test(body) || propDeps.length > 0;
    actionDecls[a] = {
      name: a,
      arity: usesProps ? 3 : /\bpayload\b|_payload/.test(body) ? 2 : 1,
      usesProps,
      propDeps,
    };
  }

  const derivedDeps: Record<string, DerivedSignature> = {};
  for (const d of script.derivedNames) {
    const body = script.members.derived[d] ?? "";
    derivedDeps[d] = {
      name: d,
      propDeps: propsShape.filter((p) => mentions(body, p)),
      stateDeps: stateShape.filter((s) => mentions(body, s)),
    };
  }

  const effects: Record<string, EffectDescriptor> = {};
  for (const e of script.effectNames) {
    const body = script.members.effects[e] ?? "";
    const every = body.match(/every\s*:\s*(\d+)/);
    const after = body.match(/after\s*:\s*(\d+)/);
    const dispatch = body.match(/dispatch\s*:\s*["']([A-Za-z_$][\w$]*)["']/);
    const whileM = body.match(/while\s*:\s*([^\n,]+)/);
    effects[e] = {
      name: e,
      kind: every ? "every" : after ? "after" : "on",
      dispatch: dispatch ? dispatch[1]! : "",
      every: every ? Number(every[1]) : undefined,
      whileExpr: whileM ? whileM[1]!.trim().replace(/[,}]\s*$/, "").trim() : undefined,
    };
  }

  return {
    name,
    specVersion: SPEC_VERSION,
    level: LEVEL,
    stateShape,
    propsShape,
    actionDecls,
    derivedDeps,
    template,
    events: template.events,
    style,
    a11y,
    effects,
  };
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
