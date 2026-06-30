// Debug harness: render a PHOTO-LIKE scene (sky gradient, sun, ground, a dark
// tree) through the colour pipeline so we can see that the result is both SHARP
// (fine luminance relief) and COLOURED (coarse CMY), and report sizes/volumes.
import { encode } from "jpeg-js";
import { writeFileSync, mkdirSync } from "fs";
import { generateColorLithophane } from "@/lib/lithophane/color";

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
// sun (warm yellow), upper-left
const sx = W * 0.28, sy = H * 0.25, sr = 34;
for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
  if ((x - sx) ** 2 + (y - sy) ** 2 < sr * sr) set(x, y, 250, 210, 90);
}
// a red-roofed house block + dark tree, right of centre
for (let y = horizon - 40; y < horizon; y++) for (let x = W * 0.62; x < W * 0.78; x++) set(x | 0, y, 200, 80, 70);
for (let y = horizon - 70; y < horizon - 10; y++) for (let x = W * 0.84; x < W * 0.9; x++) set(x | 0, y, 35, 55, 30);

const jpeg = encode({ data: rgba, width: W, height: H }, 95).data;

const r = generateColorLithophane(Buffer.from(jpeg), { widthMm: 144, heightMm: 108 });
const dir = "C:/Users/tooos/AppData/Local/Temp/claude/C--Users-tooos-desktop-frames/54e02fd1-39a3-4979-8924-b958ddae1207/scratchpad/color-rebuild";
mkdirSync(dir, { recursive: true });
writeFileSync(`${dir}/preview.png`, r.previewPng);

const kb = (b: Buffer) => (b.length / 1024).toFixed(0) + " KB";
console.log("preview:", `${dir}/preview.png`);
console.log("grid:", r.stats.nxv + "x" + r.stats.nyv, " triangles:", r.stats.trianglesTotal, " panel:", r.stats.totalThicknessMm.toFixed(2) + "mm");
console.log("3MF:", kb(r.threemf), " white:", kb(r.stls.white), " cyan:", kb(r.stls.cyan), " magenta:", kb(r.stls.magenta), " yellow:", kb(r.stls.yellow));
