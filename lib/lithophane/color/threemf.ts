import { deflateRawSync } from "zlib";
import { crc32 } from "../png";
import type { IndexedMesh } from "./slab";
import { FILAMENTS } from "./params";

// A minimal ZIP (DEFLATE) writer + a standard 3MF builder. The 3MF is an OPC
// ZIP package; we emit the three required parts plus a 4-object model (one mesh
// per filament) with a <basematerials> group, so it opens in Bambu Studio /
// OrcaSlicer as four colour-tinted parts to drop onto the AMS slots.

export interface ZipEntry {
  name: string;
  data: Buffer;
}

/** Build a ZIP archive (DEFLATE/method-8). Deterministic (fixed timestamps). */
export function makeZip(entries: ZipEntry[]): Buffer {
  const locals: Buffer[] = [];
  const centrals: Buffer[] = [];
  let offset = 0;

  for (const e of entries) {
    const nameBuf = Buffer.from(e.name, "utf8");
    const crc = crc32(e.data);
    const comp = deflateRawSync(e.data);

    const local = Buffer.alloc(30 + nameBuf.length);
    local.writeUInt32LE(0x04034b50, 0); // local file header signature
    local.writeUInt16LE(20, 4); // version needed
    local.writeUInt16LE(0, 6); // flags
    local.writeUInt16LE(8, 8); // method: deflate
    local.writeUInt16LE(0, 10); // mod time
    local.writeUInt16LE(0x21, 12); // mod date (fixed, valid: 1980-01-01)
    local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(comp.length, 18);
    local.writeUInt32LE(e.data.length, 22);
    local.writeUInt16LE(nameBuf.length, 26);
    local.writeUInt16LE(0, 28); // extra length
    nameBuf.copy(local, 30);
    locals.push(local, comp);

    const central = Buffer.alloc(46 + nameBuf.length);
    central.writeUInt32LE(0x02014b50, 0); // central dir header signature
    central.writeUInt16LE(20, 4); // version made by
    central.writeUInt16LE(20, 6); // version needed
    central.writeUInt16LE(0, 8); // flags
    central.writeUInt16LE(8, 10); // method
    central.writeUInt16LE(0, 12); // mod time
    central.writeUInt16LE(0x21, 14); // mod date
    central.writeUInt32LE(crc, 16);
    central.writeUInt32LE(comp.length, 20);
    central.writeUInt32LE(e.data.length, 24);
    central.writeUInt16LE(nameBuf.length, 28);
    central.writeUInt16LE(0, 30); // extra length
    central.writeUInt16LE(0, 32); // comment length
    central.writeUInt16LE(0, 34); // disk number
    central.writeUInt16LE(0, 36); // internal attrs
    central.writeUInt32LE(0, 38); // external attrs
    central.writeUInt32LE(offset, 42); // local header offset
    nameBuf.copy(central, 46);
    centrals.push(central);

    offset += local.length + comp.length;
  }

  const centralStart = offset;
  const centralSize = centrals.reduce((s, c) => s + c.length, 0);
  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0); // end of central directory signature
  eocd.writeUInt16LE(0, 4); // disk
  eocd.writeUInt16LE(0, 6); // central dir start disk
  eocd.writeUInt16LE(entries.length, 8);
  eocd.writeUInt16LE(entries.length, 10);
  eocd.writeUInt32LE(centralSize, 12);
  eocd.writeUInt32LE(centralStart, 16);
  eocd.writeUInt16LE(0, 20); // comment length

  return Buffer.concat([...locals, ...centrals, eocd]);
}

const fmt = (n: number): string => (Math.round(n * 1000) / 1000).toString();

function meshXml(mesh: IndexedMesh): string {
  const P = mesh.positions;
  const T = mesh.triangles;
  const verts = new Array<string>(P.length / 3);
  for (let i = 0, k = 0; i < P.length; i += 3, k++) {
    verts[k] = `<vertex x="${fmt(P[i])}" y="${fmt(P[i + 1])}" z="${fmt(P[i + 2])}"/>`;
  }
  const faces = new Array<string>(T.length / 3);
  for (let i = 0, k = 0; i < T.length; i += 3, k++) {
    faces[k] = `<triangle v1="${T[i]}" v2="${T[i + 1]}" v3="${T[i + 2]}"/>`;
  }
  return `<mesh><vertices>${verts.join("")}</vertices><triangles>${faces.join("")}</triangles></mesh>`;
}

export interface ColorSlabs {
  white: IndexedMesh;
  cyan: IndexedMesh;
  magenta: IndexedMesh;
  yellow: IndexedMesh;
}

/** The 3D/3dmodel.model XML — also used directly by tests to inspect structure. */
export function buildModelXml(slabs: ColorSlabs): string {
  const ns = "http://schemas.microsoft.com/3dmanufacturing/core/2015/02";
  const materials =
    `<basematerials id="1">` +
    `<base name="${FILAMENTS.white.name}" displaycolor="${FILAMENTS.white.hex}FF"/>` +
    `<base name="${FILAMENTS.cyan.name}" displaycolor="${FILAMENTS.cyan.hex}FF"/>` +
    `<base name="${FILAMENTS.magenta.name}" displaycolor="${FILAMENTS.magenta.hex}FF"/>` +
    `<base name="${FILAMENTS.yellow.name}" displaycolor="${FILAMENTS.yellow.hex}FF"/>` +
    `</basematerials>`;
  const obj = (id: number, pindex: number, mesh: IndexedMesh) =>
    `<object id="${id}" type="model" pid="1" pindex="${pindex}">${meshXml(mesh)}</object>`;
  return (
    `<?xml version="1.0" encoding="UTF-8"?>` +
    `<model unit="millimeter" xml:lang="en-US" xmlns="${ns}">` +
    `<resources>` +
    materials +
    obj(2, 0, slabs.white) +
    obj(3, 1, slabs.cyan) +
    obj(4, 2, slabs.magenta) +
    obj(5, 3, slabs.yellow) +
    `</resources>` +
    `<build>` +
    `<item objectid="2"/><item objectid="3"/><item objectid="4"/><item objectid="5"/>` +
    `</build>` +
    `</model>`
  );
}

/** Package the four colour slabs into a standard multi-material 3MF. */
export function buildThreeMf(slabs: ColorSlabs): Buffer {
  const contentTypes =
    `<?xml version="1.0" encoding="UTF-8"?>` +
    `<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">` +
    `<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>` +
    `<Default Extension="model" ContentType="application/vnd.ms-package.3dmanufacturing-3dmodel+xml"/>` +
    `</Types>`;
  const rels =
    `<?xml version="1.0" encoding="UTF-8"?>` +
    `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">` +
    `<Relationship Id="rel0" Target="/3D/3dmodel.model" Type="http://schemas.microsoft.com/3dmanufacturing/2013/01/3dmodel"/>` +
    `</Relationships>`;
  const model = buildModelXml(slabs);

  return makeZip([
    { name: "[Content_Types].xml", data: Buffer.from(contentTypes, "utf8") },
    { name: "_rels/.rels", data: Buffer.from(rels, "utf8") },
    { name: "3D/3dmodel.model", data: Buffer.from(model, "utf8") },
  ]);
}
