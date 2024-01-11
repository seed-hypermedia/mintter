import fs from "fs";
// Read the package.json file
const packageJsonPath = "./frontend/apps/desktop/package.json";
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf8"));

// Update the version attribute
packageJson.version = process.env.VITE_VERSION;

try {
  // Write the updated package.json back to the file
  fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));
  console.log(
    `[SET-VERSION]: Successfully change the app version to ${process.env.VITE_VERSION}`
  );
} catch (error) {
  console.error(
    `[SET-VERSION]: ERROR. something went wrong: ${JSON.stringify(error)}`
  );
}
