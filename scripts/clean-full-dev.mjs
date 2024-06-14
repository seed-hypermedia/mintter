import { execFileSync, spawn } from "child_process";
import { existsSync } from "fs";
import pkg from "fs-extra";
import { homedir, platform } from "os";
import { join } from "path";
import { cwd } from "process";
const {mkdirpSync, moveSync} = pkg;
const home = homedir();

if (platform() !== "darwin") {
  throw new Error(
    "This script can only run on macOS because it assumes the library/application support"
  );
}

const seedDir = join(home, "Library", "Application Support", "Seed.dev");
const seedSiteDir = join(
  home,
  "Library",
  "Application Support",
  "Seed.site"
);

const seedArchive = join(home, "SeedArchive");
mkdirpSync(seedArchive);

function getFormattedDateTime() {
  const now = new Date();
  const year = now.getFullYear();
  const month = (now.getMonth() + 1).toString().padStart(2, "0"); // Months are 0-based in JS, so we add 1.
  const day = now.getDate().toString().padStart(2, "0");
  const hour = now.getHours().toString().padStart(2, "0");
  const minute = now.getMinutes().toString().padStart(2, "0");
  return `${year}.${month}.${day}-${hour}.${minute}`;
}

const nowLabel = getFormattedDateTime();

if (existsSync(seedDir)) {
  console.log(`Seed App Exists. Moving to Seed`);
  moveSync(seedDir, join(seedArchive, `Seed.dev.${nowLabel}`));
}
if (existsSync(seedSiteDir)) {
  console.log(`Seed Site Exists. Moving to SeedArchive`);
  moveSync(seedSiteDir, join(seedArchive, `Seed.site.${nowLabel}`));
}

const TESTNET_NAME = "";

const desktopProcess = spawn("./dev", ["run-desktop"], {
  cwd: cwd(),
  env: {
    ...process.env,
    SEED_P2P_TESTNET_NAME: TESTNET_NAME,
  },
  stdio: "inherit",
});

const BASE_PORT = 63000;

// site cmd
// SEED_P2P_TESTNET_NAME="dev" go run ./backend/cmd/seed-site -data-dir=~/.mttsite -p2p.port=61000 --http.port=61001 -p2p.no-relay -grpc.port=61002 http://127.0.0.1:61001
const siteDaemonProcess = spawn(
  "go",
  [
    "run",
    "./backend/cmd/seed-site",
    `-data-dir=${seedSiteDir}`,
    `-p2p.port=${BASE_PORT}`,
    `--http.port=${BASE_PORT + 1}`,
    `-p2p.no-relay`,
    `-grpc.port=${BASE_PORT + 2}`,
    `http://127.0.0.1:${BASE_PORT + 1}`,
  ],
  {
    cwd: cwd(),
    env: {
      ...process.env,
      SEED_P2P_TESTNET_NAME: TESTNET_NAME,
    },
    stdio: "inherit",
  }
);

// HM_BASE_URL="http://localhost:3000" GRPC_HOST="http://localhost:61001" PORT=3000 yarn site

const siteProcess = spawn("yarn", ["site"], {
  cwd: cwd(),
  env: {
    ...process.env,
    HM_BASE_URL: `http://localhost:${BASE_PORT + 4}`,
    GRPC_HOST: `http://localhost:${BASE_PORT + 1}`,
    PORT: `${BASE_PORT + 4}`,
  },
  stdio: "inherit",
});

setTimeout(() => {
  execFileSync("open", [`http://localhost:${BASE_PORT + 4}`]);
}, 2_000);

// console.log({seedDir, time: `${getFormattedDateTime()}`});

console.log(`==============
farm, image, almost, ignore, adapt, host, broom, oil, minute, food, combine, hospital
==============`);

function cleanUp() {
  if (!siteDaemonProcess.killed) siteDaemonProcess.kill();
  if (!siteProcess.killed) siteProcess.kill();
  if (!desktopProcess.killed) desktopProcess.kill();
}

process.on("exit", cleanUp); // When your process exits
process.on("SIGINT", cleanUp); // When interrupted with CTRL+C
process.on("SIGTERM", cleanUp); // Termination signal
process.on("SIGBREAK", cleanUp); // Ctrl+Break on Windows
process.on("SIGHUP", cleanUp); // Hang up detected on controlling terminal or death of controlling process
process.on("uncaughtException", (err) => {
  console.error("Uncaught exception:", err);
  cleanUp();
  process.exit(1); // Exiting the process after logging the exception
});
