import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { fileURLToPath } from "node:url";
import { compile } from "../dist/index.js";
import { referenceFold } from "@obinexusltd/obix-validator";
import { checkEquivalence } from "@obinexusltd/obix-test";

const timerSrc = readFileSync(
  fileURLToPath(new URL("../../obix-timer/fixture/Timer.obix", import.meta.url)),
  "utf8",
).replace(/\r\n/g, "\n");

const irUrl = import.meta.resolve("@obinexusltd/obix-ir");

test("compile(Timer.obix) succeeds and produces IR + code + a11y model", () => {
  const r = compile(timerSrc, { path: "Timer.obix", irImport: irUrl });
  assert.equal(r.ok, true, JSON.stringify(r.diagnostics));
  assert.equal(r.ir.name, "Timer");
  assert.deepEqual(r.ir.stateShape.sort(), ["running", "seconds"]);
  assert.ok(r.ir.actionDecls.Tick.propDeps.includes("limitSeconds"));
  assert.equal(r.ir.style.css.includes("data-obix-scope"), true);
  assert.equal(r.a11y.liveRegions.length, 1);
});

test("emitted module executes and is adapter-equivalent to the oracle", async () => {
  const r = compile(timerSrc, { path: "Timer.obix", irImport: irUrl });
  const dir = mkdtempSync(join(tmpdir(), "obixc-test-"));
  try {
    const file = join(dir, "Timer.gen.mjs");
    writeFileSync(file, r.code, "utf8");
    const mod = await import(pathToFileURL(file).href);
    const artifact = mod.default;

    const fold = referenceFold(artifact, artifact.initialState, artifact.props, [["Start"], ["Tick"], ["Tick"], ["Stop"]]);
    assert.deepEqual(fold.finalState, { seconds: 2, running: false });

    const eq = checkEquivalence(artifact, { trace: [["Start"], ...Array(8).fill(["Tick"])] });
    assert.equal(eq.equivalent, true, eq.divergences.join("\n"));
    assert.deepEqual(eq.expected, { seconds: 5, running: false });
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("an accessibility error blocks emit — no --no-a11y", () => {
  const bad = timerSrc.replace('aria-live="polite"', 'aria-live="loud"');
  const r = compile(bad, { path: "Timer.obix" });
  assert.equal(r.ok, false);
  assert.equal(r.code, undefined);
  assert.ok(r.diagnostics.some((d) => d.code === "OBIX-A001"));
});

test("unknown binding reference is a semantic error", () => {
  const bad = timerSrc.replace("{formattedTime}", "{nope}");
  const r = compile(bad, { path: "Timer.obix" });
  assert.equal(r.ok, false);
  assert.ok(r.diagnostics.some((d) => d.code === "OBIX-S002"));
});
