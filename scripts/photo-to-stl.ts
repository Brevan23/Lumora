// Generate a real lithophane STL with the production code — no services needed.
//
//   npx tsx scripts/photo-to-stl.ts                       # built-in heart demo
//   npx tsx scripts/photo-to-stl.ts myphoto.jpg out.stl   # your own photo
//
// Any image format works here (sharp normalizes + center-crops to the 17:22
// frame, exactly like the in-browser crop). The STL geometry itself is produced
// by the same lib/lithophane code the website uses.
import { readFileSync, writeFileSync, statSync } from "fs";
import sharp from "sharp";
import { encode } from "jpeg-js";
import { generateLithophaneStl } from "../lib/lithophane";
import { DEFAULT_LITHOPHANE_PARAMS as P } from "../lib/lithophane/params";

function heartDemo(w: number, h: number): Buffer {
  const rgba = Buffer.alloc(w * h * 4);
  const cx = w / 2;
  const cy = h / 2;
  const scale = w / 2.8;
  for (let py = 0; py < h; py++) {
    for (let px = 0; px < w; px++) {
      const x = (px - cx) / scale;
      const y = -(py - cy) / scale + 0.35;
      const f = Math.pow(x * x + y * y - 1, 3) - x * x * Math.pow(y, 3);
      let L: number;
      if (f <= 0) {
        L = 0.12; // inside the heart → dark → thick relief
      } else {
        const r = Math.hypot((px - cx) / w, (py - cy) / h);
        L = 0.96 - r * 0.6; // soft light vignette behind it
      }
      const v = Math.max(0, Math.min(255, Math.round(L * 255)));
      const o = (py * w + px) * 4;
      rgba[o] = v;
      rgba[o + 1] = v;
      rgba[o + 2] = v;
      rgba[o + 3] = 255;
    }
  }
  return Buffer.from(encode({ data: rgba, width: w, height: h }, 92).data);
}

async function inputToJpeg(path: string): Promise<Buffer> {
  return sharp(readFileSync(path))
    .rotate()
    .resize(1700, 2200, { fit: "cover" }) // center-crop to 17:22, like the site
    .jpeg({ quality: 90 })
    .toBuffer();
}

async function main() {
  const input = process.argv[2];
  const output = process.argv[3] ?? "lithophane-demo.stl";

  const jpeg = input ? await inputToJpeg(input) : heartDemo(850, 1100);
  console.log(input ? `Input: ${input} (center-cropped to 17:22)` : "Input: built-in heart demo");

  const t0 = Date.now();
  const stl = await generateLithophaneStl(jpeg);
  writeFileSync(output, stl);

  const mb = (statSync(output).size / 1048576).toFixed(1);
  const tris = stl.readUInt32LE(80);
  const ow = P.reliefWidthMm + 2 * P.borderMm;
  const oh = P.reliefHeightMm + 2 * P.borderMm;
  console.log(`Wrote ${output}  (${mb} MB, ${tris.toLocaleString()} triangles, ${Date.now() - t0} ms)`);
  console.log(`Physical size: ${ow} × ${oh} × ${P.maxThicknessMm} mm  (incl. ${P.borderMm} mm border; ${P.minThicknessMm}–${P.maxThicknessMm} mm relief)`);
  console.log(`Open it: Windows "3D Viewer", a slicer (Cura / PrusaSlicer), or drag it onto https://www.viewstl.com`);
}

main().catch((e) => {
  console.error("Failed:", e);
  process.exit(1);
});
