// Generate a real lithophane STL + preview from a photo — no services needed.
//
//   npx tsx scripts/photo-to-stl.ts                       # built-in heart demo
//   npx tsx scripts/photo-to-stl.ts myphoto.jpg out.stl   # your own photo
//
// Any format works (sharp normalizes to JPEG). The lithophane pipeline itself
// (cover-fit, autocontrast, mirror, gamma, border, validation) is the same
// lib/lithophane code the website uses. Writes <out>.stl and <out>_preview.png.
import { readFileSync, writeFileSync, statSync } from "fs";
import sharp from "sharp";
import { encode } from "jpeg-js";
import { generateLithophane } from "../lib/lithophane";
import { validateTopology } from "../lib/lithophane/validate";

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
        L = 0.12;
      } else {
        const r = Math.hypot((px - cx) / w, (py - cy) / h);
        L = 0.96 - r * 0.6;
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
    .resize(2000, 2000, { fit: "inside", withoutEnlargement: true })
    .jpeg({ quality: 92 })
    .toBuffer();
}

async function main() {
  const input = process.argv[2];
  const stlOut = process.argv[3] ?? "lithophane-demo.stl";
  const previewOut = stlOut.replace(/\.stl$/i, "") + "_preview.png";

  const jpeg = input ? await inputToJpeg(input) : heartDemo(750, 1050);
  console.log(input ? `Input: ${input}` : "Input: built-in heart demo");

  const t0 = Date.now();
  const { stl, previewPng, report } = await generateLithophane(jpeg);
  writeFileSync(stlOut, stl);
  writeFileSync(previewOut, previewPng);

  const topo = validateTopology(stl);
  const mb = (statSync(stlOut).size / 1048576).toFixed(1);
  console.log(`Wrote ${stlOut}  (${mb} MB, ${report.triangles.toLocaleString()} triangles, ${Date.now() - t0} ms)`);
  console.log(`Wrote ${previewOut}  (heightmap preview, white = thick)`);
  console.log(`Size: ${report.bboxMm[0]} × ${report.bboxMm[1]} × ${report.bboxMm[2]} mm  |  validation: ${report.ok && topo.ok ? "PASS" : "FAIL"} (euler=${topo.euler})`);
  console.log(`Open the STL: viewstl.com, Windows 3D Viewer, or a slicer.`);
  if (!report.ok || !topo.ok) process.exit(1);
}

main().catch((e) => {
  console.error("Failed:", e);
  process.exit(1);
});
