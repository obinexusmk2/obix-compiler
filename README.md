# @obinexusltd/obix-compiler

**The OBIX compiler: `.obix` → canonical DOP IR → ES6.**

```bash
npm install @obinexusltd/obix-compiler
```

Installing this package installs accessibility analysis with it.

## API

```ts
import { compile, compileFile } from "@obinexusltd/obix-compiler";

const { ok, ir, code, a11y, diagnostics } = compile(source, { path: "Timer.obix" });
```

## Pipeline

```
source
  → scanSections            (obix-parser)
  → parseTemplate/Script    (obix-parser)
  → validateObixAST         (obix-spec — the parser seal, Problem 7)
  → analyzeTemplate         (obix-template)
  → semantic checks         (unknown binding refs / unknown actions)
  → analyzeA11y             (obix-accessibility — BEFORE emit, blocks on error)
  → createScopeToken + scopeCss   (obix-spec + obix-styles — one token, Problem 10)
  → buildIR                 (canonical DOP IR — DATA FIRST, nothing past here adds logic)
  → emitModule              (ES6; verbatim <script>, one definition of every action)
```

## No `--no-a11y` (Problem 5)

`analyzeA11y` runs unconditionally. `hasBlockingA11yError` → `compile()` returns
`ok: false` with no `code`. There is no option, flag or env var that skips it.
GATE 7 (`scripts/check-a11y-required.mjs`) proves it.

## Emit modes (Problem 6)

`"linked"` (default) / `"bare"` are implemented for Level 0. `"inline"` /
`"shared-inline"` throw `UnsupportedFeatureError` (Level 1) — they do not
silently degrade.

## Dependency role

`obix-spec`, `obix-ir`, `obix-parser`, `obix-template`, `obix-styles`,
`obix-accessibility`, `obix-validator`. Consumed by `obix-cli` and
`obix-language-server`. Never depends on any adapter, the runtime, or `obix-timer`.

## Level 0 status

✅ props, state, actions, derived, `every` effect, text/attr/bool/ARIA
interpolation, `on:` events, single-element `obix:if`, scoped CSS, native-mount
IR. Deferred: loops, slots, composition, hydration, SCSS, async.
