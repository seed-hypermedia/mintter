import { readFile, writeFile } from "fs/promises";

async function main() {
  const path = process.argv[2];
  const tag = process.argv[3];

  const data = await readFile(path, "utf-8");

  const newdata = data.replace(
    'version = "0.0.0"',
    `version = "${tag.replace("desktop/", "")}"`
  );

  writeFile(path, newdata, "utf-8");
}
main();
