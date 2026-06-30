// Verify the colour-lithophane generator end-to-end (no services needed):
//   npx tsx scripts/color-verify.ts
// Synthesises a colourful JPEG, runs the generator, checks slab volumes + the
// 3MF/STL/PNG structure, and writes artifacts to the scratchpad for eyeballing.
import { mkdirSync, writeFileSync } from "fs";
import { join } from "path";
import { encode } from "jpeg-js";
import {
  generateColorLithophane,
  DEFAULT_COLOR_PARAMS,
} from "../lib/lithophane/color";
import { processImageToColor } from "../lib/lithophane/color/image";
import { buildColorFields } from "../lib/lithophane/color/pipeline";
import { buildSlab, slabTriangleCount } from "../lib/lithophane/color/slab";
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

// --- manual pipeline to inspect per-slab volumes ---
const cols = Math.round(p.widthMm * p.samplesPerMm);
const rows = Math.round(p.heightMm * p.samplesPerMm);
const nxv = cols + 1, nyv = rows + 1;
const img = processImageToColor(jpeg, nxv, nyv);
const fields = buildColorFields(img, p);
const slabs = {
  white: buildSlab(0, fields.whiteTop, nxv, nyv, p.widthMm, p.heightMm),
  cyan: buildSlab(fields.whiteTop, fields.cyanTop, nxv, nyv, p.widthMm, p.heightMm),
  magenta: buildSlab(fields.cyanTop, fields.magentaTop, nxv, nyv, p.widthMm, p.heightMm),
  yellow: buildSlab(fields.magentaTop, fields.yellowTop, nxv, nyv, p.widthMm, p.heightMm),
};
console.log(`grid: ${nxv} x ${nyv} vertices (${cols} x ${rows} cells)`);
for (const [name, m] of Object.entries(slabs)) {
  console.log(`  slab ${name}: vol=${m.signedVolume.toFixed(1)} mm³, tris=${m.triangles.length / 3}`);
  assert(m.signedVolume > 0, `${name} slab has positive volume`);
  assert(m.triangles.length / 3 === slabTriangleCount(cols, rows), `${name} triangle count matches formula`);
}
const expWhite = p.widthMm * p.heightMm * p.whiteBaseMm;
assert(Math.abs(slabs.white.signedVolume - expWhite) < expWhite * 0.02, `white base ≈ ${expWhite.toFixed(0)} mm³`);

// --- integrated generate ---
const res = generateColorLithophane(jpeg, p);

// 3MF zip signature checks
assert(res.threemf.readUInt32LE(0) === 0x04034b50, "3MF starts with ZIP local header");
assert(res.threemf.readUInt32LE(res.threemf.length - 22) === 0x06054b50, "3MF ends with ZIP EOCD");

// model XML structure
const model = buildModelXml(slabs);
const objCount = (model.match(/<object /g) || []).length;
const baseCount = (model.match(/<base /g) || []).length;
assert(objCount === 4, `model XML has 4 objects (got ${objCount})`);
assert(baseCount === 4, `model XML has 4 base materials (got ${baseCount})`);

// per-colour STL triangle counts
for (const [name, stl] of Object.entries(res.stls)) {
  const tris = stl.readUInt32LE(80);
  assert(tris === slabTriangleCount(cols, rows), `${name}.stl header triangle count = ${tris}`);
}

// preview PNG signature
assert(res.previewPng.readUInt32BE(0) === 0x89504e47, "preview is a PNG");

// write artifacts
writeFileSync(join(OUT, "color-lithophane.3mf"), res.threemf);
writeFileSync(join(OUT, "preview.png"), res.previewPng);
writeFileSync(join(OUT, "model.xml"), model);
for (const [name, stl] of Object.entries(res.stls)) writeFileSync(join(OUT, `${name}.stl`), stl);
writeFileSync(join(OUT, "test-input.jpg"), jpeg);

const kb = (b: number) => (b / 1024).toFixed(0) + " KB";
console.log("\n--- sizes ---");
console.log("  3MF        :", kb(res.threemf.length));
console.log("  white.stl  :", kb(res.stls.white.length));
console.log("  cyan.stl   :", kb(res.stls.cyan.length));
console.log("  magenta.stl:", kb(res.stls.magenta.length));
console.log("  yellow.stl :", kb(res.stls.yellow.length));
console.log("  preview.png:", kb(res.previewPng.length));
console.log("  total tris :", res.stats.trianglesTotal);
console.log("  panel thickness:", res.stats.totalThicknessMm, "mm");
console.log("\nArtifacts written to:", OUT);
console.log("Preview PNG:", join(OUT, "preview.png"));
console.log("\nALL CHECKS PASSED");
