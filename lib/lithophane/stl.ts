// Minimal binary STL encoder. Pre-allocates the exact buffer, computes a unit
// normal per triangle from its winding, and asserts the final triangle count.

export class BinaryStlWriter {
  private readonly buf: Buffer;
  private readonly expected: number;
  private offset = 84; // 80-byte header + uint32 count
  private written = 0;
  private vol = 0;

  constructor(triangleCount: number) {
    this.expected = triangleCount;
    this.buf = Buffer.alloc(84 + triangleCount * 50);
    this.buf.writeUInt32LE(triangleCount, 80);
  }

  addTriangle(
    ax: number, ay: number, az: number,
    bx: number, by: number, bz: number,
    cx: number, cy: number, cz: number,
  ): void {
    // normal = normalize((b - a) × (c - a))
    const ux = bx - ax, uy = by - ay, uz = bz - az;
    const vx = cx - ax, vy = cy - ay, vz = cz - az;
    let nx = uy * vz - uz * vy;
    let ny = uz * vx - ux * vz;
    let nz = ux * vy - uy * vx;
    const len = Math.hypot(nx, ny, nz) || 1;
    nx /= len; ny /= len; nz /= len;

    let o = this.offset;
    o = this.buf.writeFloatLE(nx, o);
    o = this.buf.writeFloatLE(ny, o);
    o = this.buf.writeFloatLE(nz, o);
    o = this.buf.writeFloatLE(ax, o);
    o = this.buf.writeFloatLE(ay, o);
    o = this.buf.writeFloatLE(az, o);
    o = this.buf.writeFloatLE(bx, o);
    o = this.buf.writeFloatLE(by, o);
    o = this.buf.writeFloatLE(bz, o);
    o = this.buf.writeFloatLE(cx, o);
    o = this.buf.writeFloatLE(cy, o);
    o = this.buf.writeFloatLE(cz, o);
    o = this.buf.writeUInt16LE(0, o); // attribute byte count
    this.offset = o;
    // Accumulate the signed tetra volume (a·(b×c)/6) — the true enclosed mesh
    // volume for a closed, consistently-wound solid. Free to compute here.
    this.vol += (ax * (by * cz - bz * cy) - ay * (bx * cz - bz * cx) + az * (bx * cy - by * cx)) / 6;
    this.written += 1;
  }

  finish(): Buffer {
    if (this.written !== this.expected) {
      throw new Error(
        `STL triangle count mismatch: wrote ${this.written}, expected ${this.expected}`,
      );
    }
    return this.buf;
  }

  /** Accumulated signed volume of all written triangles (mm³). */
  get signedVolume(): number {
    return this.vol;
  }
}
