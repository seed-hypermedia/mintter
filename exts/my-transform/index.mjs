import {Transform} from "assemblyscript/transform";
import assert from "assert";
import {readFileSync} from "fs";
import {resolve} from "path";

export default class MyTransform extends Transform {
  afterCompile(module) {
    const pkg = JSON.parse(
      readFileSync(resolve(process.cwd(), "package.json"), "utf-8")
    );

    assert(!!pkg.name, "name is required");
    assert(!!pkg.version, "version is required");

    const metadata = {
      name: pkg.name,
      description: pkg.description || "",
      version: pkg.version,
    };

    module.addCustomSection(
      "mtt_meta",
      new TextEncoder().encode(JSON.stringify(metadata))
    );
  }
}
