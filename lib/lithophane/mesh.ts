import type { BinaryStlWriter } from "./stl";

export interface HeightGrid {
  /** Number of cells in x / y (vertices = cols+1 / rows+1). */
  cols: number;
  rows: number;
  /** Outer footprint size, mm. */
  width: number;
  height: number;
  /** Vertex heights, row-major: z[j*(cols+1) + i]. */
  z: Float32Array;
}

/**
 * top surface (2 per cell) + 4 walls (2 per boundary segment) + a flat back
 * fanned from the centre over the boundary loop (1 per perimeter segment).
 * The fan back keeps the mesh watertight while using ~half the triangles of a
 * full back grid.
 */
export function countTriangles(cols: number, rows: number): number {
  return 2 * cols * rows + 6 * cols + 6 * rows;
}

/**
 * Emit a watertight solid for the height grid: a varying-height top surface, 4
 * vertical walls, and a flat back at z=0 triangulated as a fan from the centre
 * over the shared boundary loop. All faces share boundary grid vertices, so the
 * mesh is a single closed manifold (euler==2) with consistent outward winding —
 * verified by validateTopology in the test harness.
 */
export function emitMesh(g: HeightGrid, w: BinaryStlWriter): void {
  const { cols, rows, width, height, z } = g;
  const nxv = cols + 1;
  const X = (i: number) => (i * width) / cols;
  const Y = (j: number) => (j * height) / rows;
  const Z = (i: number, j: number) => z[j * nxv + i];

  // Top surface — normals up (+z).
  for (let j = 0; j < rows; j++) {
    for (let i = 0; i < cols; i++) {
      const x0 = X(i), x1 = X(i + 1), y0 = Y(j), y1 = Y(j + 1);
      const z00 = Z(i, j), z10 = Z(i + 1, j), z01 = Z(i, j + 1), z11 = Z(i + 1, j + 1);
      w.addTriangle(x0, y0, z00, x1, y0, z10, x1, y1, z11);
      w.addTriangle(x0, y0, z00, x1, y1, z11, x0, y1, z01);
    }
  }

  // Walls connect the front boundary (z = thickness) to the back boundary (z=0).
  // Front (y=0), outward −y.
  for (let i = 0; i < cols; i++) {
    const x0 = X(i), x1 = X(i + 1), t0 = Z(i, 0), t1 = Z(i + 1, 0);
    w.addTriangle(x0, 0, 0, x1, 0, 0, x1, 0, t1);
    w.addTriangle(x0, 0, 0, x1, 0, t1, x0, 0, t0);
  }
  // Back (y=height), outward +y.
  for (let i = 0; i < cols; i++) {
    const x0 = X(i), x1 = X(i + 1), t0 = Z(i, rows), t1 = Z(i + 1, rows);
    w.addTriangle(x1, height, 0, x0, height, 0, x0, height, t0);
    w.addTriangle(x1, height, 0, x0, height, t0, x1, height, t1);
  }
  // Left (x=0), outward −x.
  for (let j = 0; j < rows; j++) {
    const y0 = Y(j), y1 = Y(j + 1), t0 = Z(0, j), t1 = Z(0, j + 1);
    w.addTriangle(0, y1, 0, 0, y0, 0, 0, y0, t0);
    w.addTriangle(0, y1, 0, 0, y0, t0, 0, y1, t1);
  }
  // Right (x=width), outward +x.
  for (let j = 0; j < rows; j++) {
    const y0 = Y(j), y1 = Y(j + 1), t0 = Z(cols, j), t1 = Z(cols, j + 1);
    w.addTriangle(width, y0, 0, width, y1, 0, width, y1, t1);
    w.addTriangle(width, y0, 0, width, y1, t1, width, y0, t0);
  }

  // Flat back (z=0): fan from the centre over the boundary loop (CCW from above),
  // wound (C, P_{k+1}, P_k) for an outward −z normal. Shares the wall boundary
  // vertices, so no T-junctions.
  const cx = width / 2;
  const cy = height / 2;
  const px: number[] = [];
  const py: number[] = [];
  for (let i = 0; i <= cols; i++) { px.push(X(i)); py.push(0); } // bottom
  for (let j = 1; j <= rows; j++) { px.push(width); py.push(Y(j)); } // right
  for (let i = cols - 1; i >= 0; i--) { px.push(X(i)); py.push(height); } // top
  for (let j = rows - 1; j >= 1; j--) { px.push(0); py.push(Y(j)); } // left
  const n = px.length;
  for (let k = 0; k < n; k++) {
    const b = (k + 1) % n;
    w.addTriangle(cx, cy, 0, px[b], py[b], 0, px[k], py[k], 0);
  }
}
