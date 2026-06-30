// Debug harness: render a PHOTO-LIKE scene (sky gradient, sun, ground, house, a
// dark tree) through the colour pipeline so we can see the result is both SHARP
// (fine luminance relief) and COLOURED (coarse CMY), and report every part's
// size + the final download ZIP size.
import { encode } from "jpeg-js";
import { writeFileSync, mkdirSync } from "fs";
import { generateColorLithophane } from "@/lib/lithophane/color";
import { makeZip, type ZipEntry } from "@/lib/lithophane/color/threemf";

const W = 360, H = 270;
const rgba = Buffer.alloc(W * H * 4, 255);
const set = (x: number, y: number, r: number, g: number, b: number) => {
  const o = (y * W + x) * 4;
  rgba[o] = r; rgba[o + 1] = g; rgba[o + 2] = b; rgba[o + 3] = 255;
};
const horizon = Math.round(H * 0.6);
for (let y = 0; y < H; y++) {
  for (let x = 0; x < W; x++) {
    if (y < horizon) {
      const t = y / horizon; // sky: deep blue top → pale near horizon
      set(x, y, 90 + 120 * t, 150 + 80 * t, 230 - 10 * t);
    } else {
      const t = (y - horizon) / (H - horizon); // ground: green, darker at front
      set(x, y, 80 - 30 * t, 140 - 50 * t, 70 - 30 * t);
    }
  }
}
const sx = W * 0.28, sy = H * 0.25, sr = 34;
for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
  if ((x - sx) ** 2 + (y - sy) ** 2 < sr * sr) set(x, y, 250, 210, 90);
}
for (let y = horizon - 40; y < horizon; y++) for (let x = W * 0.62; x < W * 0.78; x++) set(x | 0, y, 200, 80, 70);
for (let y = horizon - 70; y < horizon - 10; y++) for (let x = W * 0.84; x < W * 0.9; x++) set(x | 0, y, 35, 55, 30);

const jpeg = encode({ data: rgba, width: W, height: H }, 95).data;

const r = generateColorLithophane(Buffer.from(jpeg), { widthMm: 144, heightMm: 108 });
const dir = "C:/Users/tooos/AppData/Local/Temp/claude/C--Users-tooos-desktop-frames/54e02fd1-39a3-4979-8924-b958ddae1207/scratchpad/color-stl";
mkdirSync(dir, { recursive: true });
writeFileSync(`${dir}/preview.png`, r.previewPng);
for (const [name, stl] of Object.entries(r.stls)) writeFileSync(`${dir}/${name}.stl`, stl);
writeFileSync(`${dir}/color-lithophane.3mf`, r.threemf);

const stlEntries: ZipEntry[] = [
  { name: "white.stl", data: r.stls.white },
  { name: "top_white.stl", data: r.stls.topWhite },
  { name: "cyan.stl", data: r.stls.cyan },
  { name: "magenta.stl", data: r.stls.magenta },
  { name: "yellow.stl", data: r.stls.yellow },
  { name: "preview.png", data: r.previewPng },
];
const zipWith = makeZip([{ name: "color-lithophane.3mf", data: r.threemf }, ...stlEntries]);
const zipNo3mf = makeZip(stlEntries);

const mb = (b: number) => (b / 1048576).toFixed(2) + " MB";
console.log("preview:", `${dir}/preview.png`);
console.log("fine grid:", r.stats.nxv + "x" + r.stats.nyv, " coarse grid:", r.stats.cnxv + "x" + r.stats.cnyv);
console.log("triangles:", r.stats.trianglesTotal, " panel:", r.stats.totalThicknessMm.toFixed(2) + "mm");
console.log("--- part sizes ---");
for (const [name, stl] of Object.entries(r.stls)) console.log(`  ${name}.stl: ${mb(stl.length)}`);
console.log("  3MF:", mb(r.threemf.length));
console.log("--- ZIP sizes ---");
console.log("  with 3MF :", mb(zipWith.length));
console.log("  STLs only:", mb(zipNo3mf.length));
