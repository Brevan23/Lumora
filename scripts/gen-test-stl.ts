// Verification: generate a lithophane from a synthetic gradient and assert the
// value gate + full mesh topology (watertight, consistent winding, euler==2,
// positive volume). Run: npx tsx scripts/gen-test-stl.ts
import { encode } from "jpeg-js";
import { generateLithophane } from "../lib/lithophane";
import { validateTopology } from "../lib/lithophane/validate";

function makeGradient(w: number, h: number): Buffer {
  const rgba = Buffer.alloc(w * h * 4);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const v = Math.round((x / (w - 1)) * 255);
      const o = (y * w + x) * 4;
      rgba[o] = v;
      rgba[o + 1] = v;
      rgba[o + 2] = v;
      rgba[o + 3] = 255;
    }
  }
  return Buffer.from(encode({ data: rgba, width: w, height: h }, 90).data);
}

async function main() {
  const img = makeGradient(500, 700);
  // Coarse resolution keeps the full topology check fast; geometry is
  // resolution-independent.
  const { stl, previewPng, report } = await generateLithophane(img, {
    samplesPerMm: 2,
  });

  console.log(`STL: ${stl.length} bytes, ${report.triangles.toLocaleString()} triangles`);
  console.log(
    `bbox: ${report.bboxMm.map((n) => n.toFixed(2)).join(" × ")} mm | thickness [${report.thicknessMm.map((n) => n.toFixed(2)).join(", ")}] mm`,
  );
  console.log(`preview PNG: ${previewPng.length} bytes`);
  console.log(
    `gate: watertight=${report.watertight}, euler=${report.euler}, volume=${report.volumeMm3.toFixed(1)} mm³, warnings=${report.warnings.length}`,
  );

  const topo = validateTopology(stl);
  console.log(`topology(parsed): euler=${topo.euler}, volume=${topo.volume.toFixed(1)} mm³`);
  if (Math.abs(report.volumeMm3 - topo.volume) > 1) {
    console.error(`VOLUME MISMATCH: gate ${report.volumeMm3.toFixed(1)} vs parsed ${topo.volume.toFixed(1)}`);
    process.exit(1);
  }

  if (!report.ok) {
    console.error("VALUE GATE FAIL:\n - " + report.failures.join("\n - "));
    process.exit(1);
  }
  if (!topo.ok) {
    console.error("TOPOLOGY FAIL:\n - " + topo.failures.join("\n - "));
    process.exit(1);
  }
  console.log("PASS: watertight, consistent winding, euler==2, positive volume, gates ok.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
