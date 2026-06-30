// Verify the colour-lithophane generator end-to-end (no services needed):
//   npx tsx scripts/color-verify.ts
// Synthesises a colourful JPEG, runs the generator, checks part volumes + the
// 3MF/STL/PNG structure, and writes artifacts to the scratchpad for eyeballing.
import { mkdirSync, writeFileSync } from "fs";
import { join } from "path";
import { encode } from "jpeg-js";
import {
  generateColorLithophane,
  DEFAULT_COLOR_PARAMS,
} from "../lib/lithophane/color";
import { processImageToColor } from "../lib/lithophane/color/image";
import { processImageToContent } from "../lib/lithophane/image";
import { DEFAULT_LITHOPHANE_PARAMS } from "../lib/lithophane/params";
import { buildColorFields } from "../lib/lithophane/color/pipeline";
import { buildSlab, buildReliefMesh } from "../lib/lithophane/color/slab";
import { buildModelXml } from "../lib/lithophane/color/threemf";

const OUT =
  "C:/Users/tooos/AppData/Local/Temp/claude/C--Users-tooos-desktop-frames/54e02fd1-39a3-4979-8924-b958ddae1207/scratchpad/color-verify";
mkdirSync(OUT, { recursive: true });

function hsvJpeg(w: number, h: number): Buffer {
  const data = Buffer.alloc(w * h * 4);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const hue = (x / w) * 360;
      const val = 0.35 + 0.6 * (y / h);
      const c = val, hh = hue / 60, xx = c * (1 - Math.abs((hh % 2) - 1));
      let r = 0, g = 0, b = 0;
      if (hh < 1) { r = c; g = xx; }
      else if (hh < 2) { r = xx; g = c; }
      else if (hh < 3) { g = c; b = xx; }
      else if (hh < 4) { g = xx; b = c; }
      else if (hh < 5) { r = xx; b = c; }
      else { r = c; b = xx; }
      const o = (y * w + x) * 4;
      data[o] = Math.round(r * 255);
      data[o + 1] = Math.round(g * 255);
      data[o + 2] = Math.round(b * 255);
      data[o + 3] = 255;
    }
  }
  return Buffer.from(encode({ data, width: w, height: h }, 92).data);
}

function assert(cond: boolean, msg: string) {
  if (!cond) throw new Error("FAIL: " + msg);
  console.log("  ok:", msg);
}

const jpeg = hsvJpeg(300, 225);
const p = { ...DEFAULT_COLOR_PARAMS };

// --- rebuild meshes manually to inspect per-part volumes (mirrors index.ts) ---
const fineCols = Math.max(2, Math.round(p.widthMm * p.lithophaneSamplesPerMm));
const fineRows = Math.max(2, Math.round(p.heightMm * p.lithophaneSamplesPerMm));
const nxv = fineCols + 1, nyv = fineRows + 1;
const coarseSpm = 1 / p.colorBlockMm;
const cnxv = Math.max(2, Math.round(p.widthMm * coarseSpm)) + 1;
const cnyv = Math.max(2, Math.round(p.heightMm * coarseSpm)) + 1;

const coarseRgb = processImageToColor(jpeg, cnxv, cnyv);
const { lum } = processImageToContent(jpeg, nxv, nyv, {
  ...DEFAULT_LITHOPHANE_PARAMS,
  gamma: p.gamma,
});
const fields = buildColorFields(coarseRgb, lum, nxv, nyv, p);

const parts = {
  whiteBelow: buildSlab(0, p.colorInsetMm, 2, 2, p.widthMm, p.heightMm),
  whiteUpper: buildSlab(fields.colorTop, p.whiteBaseMm, cnxv, cnyv, p.widthMm, p.heightMm),
  relief: buildReliefMesh(fields.reliefTop, nxv, nyv, p.widthMm, p.heightMm, p.whiteBaseMm),
  cyan: buildSlab(p.colorInsetMm, fields.cyanTop, cnxv, cnyv, p.widthMm, p.heightMm),
  magenta: buildSlab(fields.cyanTop, fields.magentaTop, cnxv, cnyv, p.widthMm, p.heightMm),
  yellow: buildSlab(fields.magentaTop, fields.colorTop, cnxv, cnyv, p.widthMm, p.heightMm),
};
console.log(`fine grid: ${nxv}x${nyv}   coarse grid: ${cnxv}x${cnyv}`);
for (const [name, m] of Object.entries(parts)) {
  console.log(`  part ${name}: vol=${m.signedVolume.toFixed(1)} mm³, tris=${m.triangles.length / 3}`);
  assert(m.signedVolume > -1, `${name} part is not inverted (vol ≥ 0)`);
}
const expBelow = p.widthMm * p.heightMm * p.colorInsetMm;
assert(Math.abs(parts.whiteBelow.signedVolume - expBelow) < expBelow * 0.02, `white base box ≈ ${expBelow.toFixed(0)} mm³`);
assert(parts.relief.signedVolume > 0, "relief has positive volume");
// Embed check: the colour band must stay inside the white base (so there's a
// white cap above it and the relief's flat floor at whiteBaseMm never floats).
let maxColorTop = 0;
for (let k = 0; k < fields.colorTop.length; k++) {
  if (fields.colorTop[k] > maxColorTop) maxColorTop = fields.colorTop[k];
}
assert(maxColorTop <= p.whiteBaseMm + 1e-6, `colour band stays within the white base (max top ${maxColorTop.toFixed(3)} ≤ ${p.whiteBaseMm} mm)`);

// --- integrated generate ---
const res = generateColorLithophane(jpeg, p);

assert(res.threemf.readUInt32LE(0) === 0x04034b50, "3MF starts with ZIP local header");
assert(res.threemf.readUInt32LE(res.threemf.length - 22) === 0x06054b50, "3MF ends with ZIP EOCD");

const model = buildModelXml({ white: parts.whiteBelow, cyan: parts.cyan, magenta: parts.magenta, yellow: parts.yellow });
const objCount = (model.match(/<object /g) || []).length;
const baseCount = (model.match(/<base /g) || []).length;
assert(objCount === 4, `model XML has 4 objects (got ${objCount})`);
assert(baseCount === 4, `model XML has 4 base materials (got ${baseCount})`);

for (const [name, stl] of Object.entries(res.stls)) {
  const tris = stl.readUInt32LE(80);
  assert(tris > 0 && stl.length === 84 + tris * 50, `${name}.stl is a valid binary STL (${tris} tris)`);
}
assert(res.previewPng.readUInt32BE(0) === 0x89504e47, "preview is a PNG");

writeFileSync(join(OUT, "color-lithophane.3mf"), res.threemf);
writeFileSync(join(OUT, "preview.png"), res.previewPng);
for (const [name, stl] of Object.entries(res.stls)) writeFileSync(join(OUT, `${name}.stl`), stl);

const kb = (b: number) => (b / 1024).toFixed(0) + " KB";
console.log("\n--- sizes ---");
for (const [name, stl] of Object.entries(res.stls)) console.log(`  ${name}.stl: ${kb(stl.length)}`);
console.log("  3MF        :", kb(res.threemf.length));
console.log("  preview.png:", kb(res.previewPng.length));
console.log("  total tris :", res.stats.trianglesTotal);
console.log("  panel thickness:", res.stats.totalThicknessMm, "mm");
console.log("\nArtifacts written to:", OUT);
console.log("\nALL CHECKS PASSED");
