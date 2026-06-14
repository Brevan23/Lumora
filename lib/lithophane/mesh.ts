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

/** top + bottom grids + 4 walls. */
export function countTriangles(cols: number, rows: number): number {
  return 4 * cols * rows + 4 * cols + 4 * rows;
}

/**
 * Emit a watertight solid for the height grid: a varying-height top surface,
 * a flat bottom at z=0, and 4 vertical walls. All faces share grid vertices, so
 * the mesh is manifold with consistent outward winding (verified separately).
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

  // Bottom — flat z=0, normals down (−z): reverse winding of the top.
  for (let j = 0; j < rows; j++) {
    for (let i = 0; i < cols; i++) {
      const x0 = X(i), x1 = X(i + 1), y0 = Y(j), y1 = Y(j + 1);
      w.addTriangle(x0, y0, 0, x1, y1, 0, x1, y0, 0);
      w.addTriangle(x0, y0, 0, x0, y1, 0, x1, y1, 0);
    }
  }

  // Wall: front (y=0), outward normal −y.
  for (let i = 0; i < cols; i++) {
    const x0 = X(i), x1 = X(i + 1);
    const t0 = Z(i, 0), t1 = Z(i + 1, 0);
    w.addTriangle(x0, 0, 0, x1, 0, 0, x1, 0, t1);
    w.addTriangle(x0, 0, 0, x1, 0, t1, x0, 0, t0);
  }

  // Wall: back (y=height), outward normal +y.
  for (let i = 0; i < cols; i++) {
    const x0 = X(i), x1 = X(i + 1);
    const t0 = Z(i, rows), t1 = Z(i + 1, rows);
    w.addTriangle(x1, height, 0, x0, height, 0, x0, height, t0);
    w.addTriangle(x1, height, 0, x0, height, t0, x1, height, t1);
  }

  // Wall: left (x=0), outward normal −x.
  for (let j = 0; j < rows; j++) {
    const y0 = Y(j), y1 = Y(j + 1);
    const t0 = Z(0, j), t1 = Z(0, j + 1);
    w.addTriangle(0, y1, 0, 0, y0, 0, 0, y0, t0);
    w.addTriangle(0, y1, 0, 0, y0, t0, 0, y1, t1);
  }

  // Wall: right (x=width), outward normal +x.
  for (let j = 0; j < rows; j++) {
    const y0 = Y(j), y1 = Y(j + 1);
    const t0 = Z(cols, j), t1 = Z(cols, j + 1);
    w.addTriangle(width, y0, 0, width, y1, 0, width, y1, t1);
    w.addTriangle(width, y0, 0, width, y1, t1, width, y0, t0);
  }
}
