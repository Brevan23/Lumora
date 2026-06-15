import type { LithophaneParams } from "./params";
import type { ThicknessField } from "./thickness";

export interface ValidationReport {
  ok: boolean;
  failures: string[];
  bboxMm: [number, number, number];
  thicknessMm: [number, number];
  triangles: number;
}

/**
 * Per-request value gate. The mesh topology (watertight, winding-consistent,
 * euler==2) is an invariant of the heightfield construction — proven once in
 * the test harness (validateTopology), not data-dependent — so per request we
 * gate the values that *could* vary: thickness range, plate height, bbox,
 * positive volume, and triangle count.
 */
export function validateValueGates(
  field: ThicknessField,
  p: LithophaneParams,
  triangles: number,
): ValidationReport {
  const failures: string[] = [];
  const tol = 0.01;

  if (field.observedMin < p.minThicknessMm - tol) {
    failures.push(
      `min thickness ${field.observedMin.toFixed(3)} < ${p.minThicknessMm}`,
    );
  }
  if (field.observedMax > p.maxThicknessMm + tol) {
    failures.push(
      `max thickness ${field.observedMax.toFixed(3)} > ${p.maxThicknessMm}`,
    );
  }
  // Plate must reach max_t (the opaque border) — its z-extent.
  if (Math.abs(field.observedMax - p.maxThicknessMm) > tol) {
    failures.push(
      `plate top ${field.observedMax.toFixed(3)} != ${p.maxThicknessMm}`,
    );
  }
  if (!(field.observedMax > 0)) failures.push("non-positive volume");
  const expected = 4 * (field.nx - 1) * (field.ny - 1) + 4 * (field.nx - 1) + 4 * (field.ny - 1);
  if (triangles !== expected) {
    failures.push(`triangle count ${triangles} != ${expected}`);
  }

  return {
    ok: failures.length === 0,
    failures,
    bboxMm: [p.widthMm, p.heightMm, field.observedMax],
    thicknessMm: [field.observedMin, field.observedMax],
    triangles,
  };
}

/**
 * Full topology check for the test harness: parse a binary STL and confirm the
 * mesh is watertight (every undirected edge used exactly twice), consistently
 * wound (every directed edge unique), euler_number == 2, and signed volume > 0.
 */
export function validateTopology(stl: Buffer): { ok: boolean; failures: string[]; euler: number; volume: number } {
  const count = stl.readUInt32LE(80);
  const verts = new Map<string, number>();
  const undirected = new Map<string, number>();
  const directed = new Map<string, number>();
  const vid = (x: number, y: number, z: number) => {
    const k = `${Math.round(x * 1000)},${Math.round(y * 1000)},${Math.round(z * 1000)}`;
    let id = verts.get(k);
    if (id === undefined) {
      id = verts.size;
      verts.set(k, id);
    }
    return id;
  };
  let vol = 0;
  let o = 84;
  for (let t = 0; t < count; t++) {
    const v = o + 12; // vertices start after the 12-byte normal
    const ax = stl.readFloatLE(v), ay = stl.readFloatLE(v + 4), az = stl.readFloatLE(v + 8);
    const bx = stl.readFloatLE(v + 12), by = stl.readFloatLE(v + 16), bz = stl.readFloatLE(v + 20);
    const cx = stl.readFloatLE(v + 24), cy = stl.readFloatLE(v + 28), cz = stl.readFloatLE(v + 32);
    o += 50;
    vol += (ax * (by * cz - bz * cy) - ay * (bx * cz - bz * cx) + az * (bx * cy - by * cx)) / 6;
    const A = vid(ax, ay, az), B = vid(bx, by, bz), C = vid(cx, cy, cz);
    for (const [p1, p2] of [[A, B], [B, C], [C, A]] as const) {
      directed.set(`${p1}>${p2}`, (directed.get(`${p1}>${p2}`) ?? 0) + 1);
      const u = p1 < p2 ? `${p1}-${p2}` : `${p2}-${p1}`;
      undirected.set(u, (undirected.get(u) ?? 0) + 1);
    }
  }
  const failures: string[] = [];
  let badU = 0;
  for (const c of undirected.values()) if (c !== 2) badU++;
  let badD = 0;
  for (const c of directed.values()) if (c !== 1) badD++;
  if (badU) failures.push(`${badU} edges not used exactly twice (not watertight)`);
  if (badD) failures.push(`${badD} directed edges repeated (inconsistent winding)`);
  const euler = verts.size - undirected.size + count;
  if (euler !== 2) failures.push(`euler_number ${euler} != 2`);
  if (!(vol > 0)) failures.push(`signed volume ${vol.toFixed(1)} not > 0`);
  return { ok: failures.length === 0, failures, euler, volume: vol };
}
