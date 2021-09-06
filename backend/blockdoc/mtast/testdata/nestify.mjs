// This script was used to make flat lorem ipsum document into a nested one.

import * as fs from "fs"

const flat = JSON.parse(fs.readFileSync("lorem-150-flat.json"))

const nested = {
  "type": "group",
  "children": [],
}

let last = null
let nesting = true

let idx = 0
for (let f of flat.children) {  
  idx++

  if ((idx % 5) == 0) {
    nesting = !nesting
  }

  if (nesting && last) {
    last.children[1] = {
      "type": "group",
      "children": [f]
    }
  } else {
    nested.children.push(f)
  }
  
  last = f
}

fs.writeFileSync("./lorem-150-nested.json", JSON.stringify(nested, null, 2))
