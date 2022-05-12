import { exec } from "child_process";
import { readFile } from "fs/promises";
import { join } from "path";
import glob from "tiny-glob";

const BASE_URL = "https://mintterreleases.s3.amazonaws.com/";

async function main() {
  process.chdir(join(process.cwd(), "./artifacts"));

  const tag = process.argv[2];

  const obj = {
    name: tag,
    notes: await getNotesForTag(tag),
    pub_date: new Date().toISOString(),
    platforms: {
      darwin: await getPlatform("app.tar.gz", "app.tar.gz.sig"),
      linux: await getPlatform("AppImage.tar.gz", "AppImage.tar.gz.sig"),
      windows: await getPlatform("msi.zip", "msi.zip.sig"),
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

async function getPlatform(...exts) {
  const [artifact, signature] = await glob(`**/*.{${exts.join(",")}}`);

  return {
    url: `${BASE_URL}${artifact}`,
    signature: await readFile(signature, "utf-8"),
  };
}

async function execCmd(cmd, args, options = {}) {
  return new Promise((resolve, reject) => {
    exec(
      `${cmd} ${args.join(" ")}`,
      { ...options, encoding: "utf-8" },
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
