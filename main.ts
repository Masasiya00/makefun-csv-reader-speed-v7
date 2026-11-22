// Program penggerak: membaca semua kasus, menjawab masing-masing
// dengan run, lalu menulis semua jawaban dalam urutan yang sama.
//
// Direktori masukan dan keluaran diambil dari environment bila
// harness menyediakannya, bila tidak memakai jalur standar /input
// dan /output. Penandaan inkremental mesin dimatikan sebelum
// solve.js dimuat, seperti yang dilakukan program dasar.
import { setFlagsFromString } from "node:v8";

setFlagsFromString("--no-incremental-marking");

const { run } = await import("./solve.js");

import { readFileSync, mkdirSync, createWriteStream } from "node:fs";
import { join } from "node:path";

const inputDir = process.env.MAKEFUN_INPUT_DIR ?? "/input";
const outputDir = process.env.MAKEFUN_OUTPUT_DIR ?? "/output";

const cases = JSON.parse(
  readFileSync(join(inputDir, "cases.json"), "utf8"),
);

mkdirSync(outputDir, { recursive: true });
const out = createWriteStream(join(outputDir, "answers.json"), "utf8");

out.write("[");
for (let i = 0; i < cases.length; i++) {
  if (i > 0) out.write(",");
  out.write(JSON.stringify(run(cases[i].input)));
}
out.write("]");

await new Promise((resolve, reject) => {
  out.on("finish", resolve);
  out.on("error", reject);
  out.end();
});
