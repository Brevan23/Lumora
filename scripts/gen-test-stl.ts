// Verification: generate a lithophane STL from a synthetic gradient and assert
// the mesh is watertight (manifold + consistent winding), positively oriented,
// and correctly bounded. Run: npx tsx scripts/gen-test-stl.ts
import sharp from "sharp";
import { generateLithophaneStl } from "../lib/lithophane";
import { DEFAULT_LITHOPHANE_PARAMS } from "../lib/lithophane/params";

async function makeGradient(w: number, h: number): Promise<Buffer> {
  const raw = Buffer.alloc(w * h * 3);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const v = Math.round((x / (w - 1)) * 255); // horizontal black→white
      const o = (y * w + x) * 3;
      raw[o] = v;
      raw[o + 1] = v;
      raw[o + 2] = v;
    }
  }
  return sharp(raw, { raw: { width: w, height: h, channels: 3 } })
    .jpeg()
    .toBuffer();
}

function validate(buf: Buffer) {
  const count = buf.readUInt32LE(80);
  const errors: string[] = [];
  const dir = new Map<string, number>();
  const und = new Map<string, number>();
  const key = (x: number, y: number, z: number) =>
    `${Math.round(x * 1000)},${Math.round(y * 1000)},${Math.round(z * 1000)}`;
  let minX = Infinity, minY = Infinity, minZ = Infinity;
  let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;
  let vol = 0;

  let o = 84;
  for (let i = 0; i < count; i++) {
    o += 12; // skip normal
    const v: number[] = [];
    for (let k = 0; k < 9; k++) {
      v.push(buf.readFloatLE(o));
      o += 4;
    }
    o += 2; // attribute bytes
    const [ax, ay, az, bx, by, bz, cx, cy, cz] = v;
    const A = key(ax, ay, az), B = key(bx, by, bz), C = key(cx, cy, cz);
    for (const [p, q] of [[A, B], [B, C], [C, A]] as const) {
      dir.set(`${p}|${q}`, (dir.get(`${p}|${q}`) ?? 0) + 1);
      const uk = p < q ? `${p}#${q}` : `${q}#${p}`;
      und.set(uk, (und.get(uk) ?? 0) + 1);
    }
    vol += (ax * (by * cz - bz * cy) - ay * (bx * cz - bz * cx) + az * (bx * cy - by * cx)) / 6;
    for (const [x, y, z] of [[ax, ay, az], [bx, by, bz], [cx, cy, cz]] as const) {
      minX = Math.min(minX, x); maxX = Math.max(maxX, x);
      minY = Math.min(minY, y); maxY = Math.max(maxY, y);
      minZ = Math.min(minZ, z); maxZ = Math.max(maxZ, z);
    }
  }

  let dirDup = 0;
  for (const c of dir.values()) if (c !== 1) dirDup++;
  let badUnd = 0;
  for (const c of und.values()) if (c !== 2) badUnd++;
  if (dirDup > 0) errors.push(`${dirDup} directed edges repeated (inconsistent winding)`);
  if (badUnd > 0) errors.push(`${badUnd} edges not used exactly twice (not watertight)`);
  if (vol <= 0) errors.push(`signed volume not positive (${vol.toFixed(1)})`);

  return { count, errors, bbox: [minX, minY, minZ, maxX, maxY, maxZ], vol };
}

async function main() {
  const p = DEFAULT_LITHOPHANE_PARAMS;
  const outerW = p.reliefWidthMm + 2 * p.borderMm;
  const outerH = p.reliefHeightMm + 2 * p.borderMm;

  const img = await makeGradient(340, 440);
  const stl = await generateLithophaneStl(img, { cellMm: 2 }); // coarse = fast

  const { count, errors, bbox, vol } = validate(stl);
  console.log(`STL bytes: ${stl.length}, triangles: ${count}`);
  console.log(
    `bbox x[${bbox[0]}..${bbox[3]}] y[${bbox[1]}..${bbox[4]}] z[${bbox[2].toFixed(2)}..${bbox[5].toFixed(2)}]`,
  );
  console.log(`signed volume: ${vol.toFixed(1)} mm^3`);

  const near = (a: number, b: number, t = 0.6) => Math.abs(a - b) <= t;
  if (!near(bbox[0], 0) || !near(bbox[3], outerW))
    errors.push(`x extent ${bbox[0]}..${bbox[3]} != 0..${outerW}`);
  if (!near(bbox[1], 0) || !near(bbox[4], outerH))
    errors.push(`y extent ${bbox[1]}..${bbox[4]} != 0..${outerH}`);
  if (!near(bbox[2], 0) || !near(bbox[5], p.maxThicknessMm))
    errors.push(`z extent ${bbox[2]}..${bbox[5]} != 0..${p.maxThicknessMm}`);

  if (errors.length) {
    console.error("FAIL:\n - " + errors.join("\n - "));
    process.exit(1);
  }
  console.log("PASS: watertight, consistent winding, positive volume, correct bounds.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
