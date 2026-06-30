// Debug harness: render the predicted-lit preview from a swatch image so we can
// see whether distinct colours survive the pipeline (run before/after fixes).
import { encode } from "jpeg-js";
import { writeFileSync } from "fs";
import { generateColorLithophane } from "@/lib/lithophane/color";

const COLORS: [string, [number, number, number]][] = [
  ["red", [220, 40, 40]], ["green", [40, 180, 70]], ["blue", [40, 70, 210]],
  ["yellow", [240, 220, 50]], ["cyan", [40, 200, 210]], ["magenta", [210, 50, 170]],
  ["skin", [235, 185, 155]], ["sky", [140, 185, 235]], ["foliage", [90, 140, 70]],
  ["midgray", [128, 128, 128]], ["ltgray", [200, 200, 200]], ["orange", [235, 140, 40]],
  ["white", [250, 250, 250]], ["black", [25, 25, 25]], ["teal", [40, 150, 140]],
  ["purple", [120, 70, 180]],
];

const W = 280, H = 210, COLS = 4;
const ROWS = Math.ceil(COLORS.length / COLS);
const rgba = Buffer.alloc(W * H * 4, 255);
for (let y = 0; y < H; y++) {
  for (let x = 0; x < W; x++) {
    const col = Math.min(COLS - 1, Math.floor((x / W) * COLS));
    const row = Math.min(ROWS - 1, Math.floor((y / H) * ROWS));
    const idx = row * COLS + col;
    const [, rgb] = COLORS[Math.min(COLORS.length - 1, idx)];
    const o = (y * W + x) * 4;
    rgba[o] = rgb[0]; rgba[o + 1] = rgb[1]; rgba[o + 2] = rgb[2]; rgba[o + 3] = 255;
  }
}
const jpeg = encode({ data: rgba, width: W, height: H }, 95).data;

const out = process.argv[2] || "preview-debug.png";
const { previewPng } = generateColorLithophane(Buffer.from(jpeg), { widthMm: 144, heightMm: 108 });
const dir = "C:/Users/tooos/AppData/Local/Temp/claude/C--Users-tooos-desktop-frames/54e02fd1-39a3-4979-8924-b958ddae1207/scratchpad/color-debug";
require("fs").mkdirSync(dir, { recursive: true });
writeFileSync(`${dir}/${out}`, previewPng);
console.log(`wrote ${dir}/${out}  (swatches L→R,T→B: ${COLORS.map((c) => c[0]).join(", ")})`);
