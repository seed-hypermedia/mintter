import { exec } from "child_process";
import { readFile } from "fs/promises";
import { join } from "path";
import glob from "tiny-glob";

const BASE_URL = "https://mintterreleases.s3.amazonaws.com/";

async function main() {
  process.chdir(join(process.cwd(), "./artifacts"));

  const tag = process.argv[2];

  const obj = {
    name: tag.replace("desktop/", ""),
    notes: await getNotesForTag(tag),
    pub_date: new Date().toISOString(),
    platforms: {
      "darwin-aarch64": await getPlatform("arm64", [
        "app.tar.gz",
        "app.tar.gz.sig",
      ]),
      "darwin-x86_64": await getPlatform("amd64", [
        "app.tar.gz",
        "app.tar.gz.sig",
      ]),
      "linux-x86_64": await getPlatform("amd64", [
        "AppImage.tar.gz",
        "AppImage.tar.gz.sig",
      ]),
      // "windows-x86_64": await getPlatform("amd64", ["msi.zip", "msi.zip.sig"]),
    },
  };

  console.log(JSON.stringify(obj, null, 2));
}
main();

async function getNotesForTag(tag) {
  // echo "$(git tag -l --format='%(contents:subject)%0a%(contents:body)' desktop/0.0.3)"
  return execCmd("git", [
    "tag",
    "-l",
    '--format="%(contents:subject)%(contents:body)"',
    tag,
  ]);
}

async function getPlatform(arch, exts) {
  const [artifact, signature] = await glob(`${arch}/**/*.{${exts.join(",")}}`);

  return {
    url: `${BASE_URL}${artifact}`,
    signature: await readFile(signature, "utf-8"),
  };
}

async function execCmd(cmd, args, options = {}) {
  return new Promise((resolve, reject) => {
    exec(
      `${cmd} ${args.join(" ")}`,
      {...options, encoding: "utf-8"},
      (error, stdout, stderr) => {
        if (error) {
          console.error(
            `Failed to execute cmd ${cmd} with args: ${args.join(
              " "
            )}. reason: ${error}`
          );
          reject(stderr);
        } else {
          resolve(stdout);
        }
      }
    );
  });
}
