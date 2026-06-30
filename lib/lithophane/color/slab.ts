import { BinaryStlWriter } from "../stl";

// A watertight "slab" solid between a floor and a ceiling height field over a
// shared vertex grid: top surface (ceiling, +z) + bottom surface (floor, −z) +
// 4 walls stitching their boundaries. This generalises mesh.ts (which assumes a
// flat z=0 floor) so the colour stack's bands — each sitting on the one below —
// can each be emitted as their own solid. Geometry is built once as an indexed
// mesh, then encoded to STL and/or referenced by the 3MF writer.

export interface IndexedMesh {
  /** Vertex positions, mm: [x0,y0,z0, x1,y1,z1, ...]. */
  positions: Float32Array;
  /** Triangle vertex indices: [a0,b0,c0, ...]. */
  triangles: Uint32Array;
  /** Signed enclosed volume, mm³ (positive for consistent outward winding). */
  signedVolume: number;
}

/** top grid + bottom grid + 4 walls. */
export function slabTriangleCount(cols: number, rows: number): number {
  return 4 * cols * rows + 4 * cols + 4 * rows;
}

/**
 * Build the solid between `floor` and `ceil` over an nxv × nyv vertex grid
 * spanning widthMm × heightMm. `floor` may be a constant (e.g. 0 for the white
 * base). Wall winding mirrors mesh.ts, so the result is a single closed,
 * consistently-wound manifold; zero-thickness regions collapse to coincident
 * faces, which slicers tolerate.
 */
export function buildSlab(
  floor: Float32Array | number,
  ceil: Float32Array,
  nxv: number,
  nyv: number,
  widthMm: number,
  heightMm: number,
): IndexedMesh {
  const cols = nxv - 1;
  const rows = nyv - 1;
  const nv = nxv * nyv;
  const positions = new Float32Array(nv * 2 * 3);
  const X = (i: number) => (i * widthMm) / cols;
  const Y = (j: number) => (j * heightMm) / rows;

  const floorIsNum = typeof floor === "number";
  const floorNum = floorIsNum ? (floor as number) : 0;
  const floorArr = floorIsNum ? null : (floor as Float32Array);
  const fAt = (k: number): number => (floorArr ? floorArr[k] : floorNum);

  // Top vertices [0, nv), bottom vertices [nv, 2nv).
  for (let j = 0; j < nyv; j++) {
    for (let i = 0; i < nxv; i++) {
      const k = j * nxv + i;
      const x = X(i);
      const y = Y(j);
      const to = k * 3;
      positions[to] = x;
      positions[to + 1] = y;
      positions[to + 2] = ceil[k];
      const bo = (nv + k) * 3;
      positions[bo] = x;
      positions[bo + 1] = y;
      positions[bo + 2] = fAt(k);
    }
  }

  const top = (i: number, j: number) => j * nxv + i;
  const bot = (i: number, j: number) => nv + j * nxv + i;
  const tris: number[] = [];

  // Top surface (+z) — same winding as mesh.ts top.
  for (let j = 0; j < rows; j++) {
    for (let i = 0; i < cols; i++) {
      const a = top(i, j), b = top(i + 1, j), c = top(i + 1, j + 1), d = top(i, j + 1);
      tris.push(a, b, c, a, c, d);
    }
  }
  // Bottom surface (−z) — reverse winding.
  for (let j = 0; j < rows; j++) {
    for (let i = 0; i < cols; i++) {
      const a = bot(i, j), b = bot(i + 1, j), c = bot(i + 1, j + 1), d = bot(i, j + 1);
      tris.push(a, c, b, a, d, c);
    }
  }
  // Front wall (j=0, outward −y).
  for (let i = 0; i < cols; i++) {
    const tl = top(i, 0), tr = top(i + 1, 0), bl = bot(i, 0), br = bot(i + 1, 0);
    tris.push(bl, br, tr, bl, tr, tl);
  }
  // Back wall (j=rows, outward +y).
  for (let i = 0; i < cols; i++) {
    const tl = top(i, rows), tr = top(i + 1, rows), bl = bot(i, rows), br = bot(i + 1, rows);
    tris.push(br, bl, tl, br, tl, tr);
  }
  // Left wall (i=0, outward −x).
  for (let j = 0; j < rows; j++) {
    const tt = top(0, j), tb = top(0, j + 1), bt = bot(0, j), bb = bot(0, j + 1);
    tris.push(bb, bt, tt, bb, tt, tb);
  }
  // Right wall (i=cols, outward +x).
  for (let j = 0; j < rows; j++) {
    const tt = top(cols, j), tb = top(cols, j + 1), bt = bot(cols, j), bb = bot(cols, j + 1);
    tris.push(bt, bb, tb, bt, tb, tt);
  }

  const triangles = Uint32Array.from(tris);

  // Signed volume = Σ a·(b×c)/6 over all triangles.
  let vol = 0;
  for (let t = 0; t < triangles.length; t += 3) {
    const ai = triangles[t] * 3, bi = triangles[t + 1] * 3, ci = triangles[t + 2] * 3;
    const ax = positions[ai], ay = positions[ai + 1], az = positions[ai + 2];
    const bx = positions[bi], by = positions[bi + 1], bz = positions[bi + 2];
    const cx = positions[ci], cy = positions[ci + 1], cz = positions[ci + 2];
    vol += (ax * (by * cz - bz * cy) - ay * (bx * cz - bz * cx) + az * (bx * cy - by * cx)) / 6;
  }

  return { positions, triangles, signedVolume: vol };
}

/** Concatenate two indexed meshes into one (offsetting the second's indices).
 *  Used to print the white base and the white luminance relief as a single
 *  white-filament object. */
export function mergeMeshes(a: IndexedMesh, b: IndexedMesh): IndexedMesh {
  const positions = new Float32Array(a.positions.length + b.positions.length);
  positions.set(a.positions, 0);
  positions.set(b.positions, a.positions.length);
  const off = a.positions.length / 3;
  const triangles = new Uint32Array(a.triangles.length + b.triangles.length);
  triangles.set(a.triangles, 0);
  for (let i = 0; i < b.triangles.length; i++) {
    triangles[a.triangles.length + i] = b.triangles[i] + off;
  }
  return { positions, triangles, signedVolume: a.signedVolume + b.signedVolume };
}

/** Encode an indexed mesh as binary STL (reuses the existing writer). */
export function meshToStl(mesh: IndexedMesh): Buffer {
  const w = new BinaryStlWriter(mesh.triangles.length / 3);
  const P = mesh.positions;
  const T = mesh.triangles;
  for (let t = 0; t < T.length; t += 3) {
    const a = T[t] * 3, b = T[t + 1] * 3, c = T[t + 2] * 3;
    w.addTriangle(
      P[a], P[a + 1], P[a + 2],
      P[b], P[b + 1], P[b + 2],
      P[c], P[c + 1], P[c + 2],
    );
  }
  return w.finish();
}
