import { SPEC_VERSION, LEVEL } from "obix-spec";
export function buildIR(opts) {
    const { name, script, template, a11y, style } = opts;
    const stateShape = keysOf(script.stateInit);
    const propsShape = keysOf(script.propsInit);
    const mentions = (body, ident) => new RegExp(`\\b${ident}\\b`).test(body);
    const actionDecls = {};
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
    const derivedDeps = {};
    for (const d of script.derivedNames) {
        const body = script.members.derived[d] ?? "";
        derivedDeps[d] = {
            name: d,
            propDeps: propsShape.filter((p) => mentions(body, p)),
            stateDeps: stateShape.filter((s) => mentions(body, s)),
        };
    }
    const effects = {};
    for (const e of script.effectNames) {
        const body = script.members.effects[e] ?? "";
        const every = body.match(/every\s*:\s*(\d+)/);
        const after = body.match(/after\s*:\s*(\d+)/);
        const dispatch = body.match(/dispatch\s*:\s*["']([A-Za-z_$][\w$]*)["']/);
        const whileM = body.match(/while\s*:\s*([^\n,]+)/);
        effects[e] = {
            name: e,
            kind: every ? "every" : after ? "after" : "on",
            dispatch: dispatch ? dispatch[1] : "",
            every: every ? Number(every[1]) : undefined,
            whileExpr: whileM ? whileM[1].trim().replace(/[,}]\s*$/, "").trim() : undefined,
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
function keysOf(objSrc) {
    if (!objSrc)
        return [];
    const inner = objSrc.replace(/^\s*\{/, "").replace(/\}\s*$/, "");
    const keys = [];
    const re = /(?:^|,)\s*([A-Za-z_$][\w$]*)\s*:/g;
    let m;
    while ((m = re.exec(inner)) !== null)
        keys.push(m[1]);
    return keys;
}
//# sourceMappingURL=ir.js.map