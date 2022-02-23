import { FlowContent } from "@mintter/mttast";

export function transformBlock(entry: FlowContent): Block {
  return slateToAPI(entry)
}

// Block is the structure that would mirror the API Block message.
export class Block {
  id: string;
  type: string;
  //@ts-ignore
  attributes: { [key: string]: string };
  text: string;
  //@ts-ignore
  layers: Layer[];

  constructor(id: string, type: string) {
    this.id = id;
    this.type = type;
    this.text = "";
  }
}

// Layer is a group of related Spans.
class Layer {
  type: string;
  attributes: { [key: string]: string } | null;
  // Instead of doing something like Span[], we store spans in a "columnar" format.
  // Both arrays must have the same length, and must be ordered. Look up "structure of arrays vs. array of structures", to learn more.
  // This improves encoding (quite a lot) and memory usage (slightly).
  //
  // If you think normally about spans, you can think of it as a table:
  //
  // | Start | End |
  // |-------|-----|
  // | 0     | 5   |
  // | 7     | 10  |
  // | ...   | ... |
  //
  // This columnar approach basically "transposes" this table, so that it becomes:
  // start: 0,  5, ...
  // end:   7, 10, ...
  //@ts-ignore
  starts: number[];
  //@ts-ignore
  ends: number[];

  constructor(type: string, attributes: { [key: string]: string } | null) {
    this.type = type
    this.attributes = attributes
  }

  // Adds a span or extends previous one if adjacent
  addSpan(start: number, end: number) {
    // We don't need to use any fancy range set data structure here, because we know specifics of our environment,
    // i.e. we know that we'll only ever iterate over the Slate leaves in order, only going forward and never backwards.
    // So, all the possible derived spans will always be sorted.
    // Therefore, to detect adjacent spans, we only need to check the last one and the incoming one.
    if (!this.starts) {
      this.starts = [];
    }

    if (!this.ends) {
      this.ends = [];
    }

    if (this.starts.length == 0) {
      this._pushSpan(start, end);
      return;
    }

    const lastIdx = this.starts.length - 1;

    // If the incoming span continues the one we already have
    // we just extend the old end until the incoming end,
    // i.e. we merge two spans together.
    if (this.ends[lastIdx] == start) {
      this.ends[lastIdx] = end;
      return;
    }

    // Otherwise we just append the span.
    this._pushSpan(start, end);
  }

  // Checks if a position expressed in code points is within any of the span
  // of this layer.
  // It assumes starts and ends array are valid span values, and are sorted,
  // because it's implemented as a binary search.
  // It returns array index of the span the position matches.
  // Otherwise it returns -1.
  contains(pos: number): number {
    let low = 0;
    let high = this.starts.length - 1;
    let mid = 0;

    while (low <= high) {
      mid = Math.floor((low + high) / 2);
      // Binary search. If the midpoint span ends before the position
      // we're checking — we drop the left side of the array entirely.
      if (this.ends[mid] <= pos) {
        low = mid + 1;
      } else {
        high = mid - 1;
      }
    }

    if (low == this.starts.length) {
      return -1;
    }

    if (this.starts[low] <= pos && pos < this.ends[low]) {
      return low;
    }

    return -1;
  }

  // appends span as a new span without checking adjacency
  _pushSpan(start: number, end: number) {
    this.starts.push(start);
    this.ends.push(end);
  }
}

// LayerSet wraps multiple layers in a single structure.
class LayerSet {
  // Map key should be some "identity" for a layer, which should consist
  // of layer's type and its attributes in some canonical representation,
  // which should be created deterministically, i.e. same type and attributes,
  // must result in the same layer ID.
  // In this concrete example I'm using just the type as an ID.
  layers: Map<string, Layer>;

  constructor() {
    this.layers = new Map();
  }

  addSpan(
    type: string,
    attributes: { [key: string]: string } | null,
    start: number,
    end: number
  ) {
    const id = this._layerID(type, attributes);

    let layer = this.layers.get(id);
    if (!layer) {
      layer = new Layer(type, attributes);
      this.layers.set(id, layer);
    }

    layer.addSpan(start, end);
  }

  _layerID(type: string, attributes: { [key: string]: string } | null): string {
    // TODO: Here we'd need to create id of a layer, taking into account the attributes.
    if (attributes && attributes.url) {
      return `${type}-${attributes.url}`;
    }

    return type;
  }

  list(): Layer[] {
    // We sort layers by their "identity" key.
    const keys = Array.from(this.layers.keys()).sort();
    // Then we create an output array of the same size as the number of layers.
    let out: Layer[] = new Array(keys.length);
    // Then we add layers in the proper order.
    for (let i in keys) {
      out[i] = this.layers.get(keys[i]);
    }

    out = out.sort((a, b) => {
      let startA = a.starts[0]
      let startB = b.starts[0]

      return startA - startB
    })

    return out;
  }
}


// This example only deals with a single level of leaves.
// You'd need to think about something for multiple layers,
// like `codeblock(text, text, link(text, text))` or something like that.
function slateToAPI(slateBlock: any): Block {

  // this is to flatten the links into its underlying leaves passing all the attributes (the url) to them.
  let leaves = flattenLeaves(slateBlock.children[0].children)

  const out = new Block(slateBlock.id, slateBlock.type);

  const layers = new LayerSet();

  // We'll have to count our current position in code points.
  let pos = 0;
  console.log("🚀 ~ file: transform-block.ts ~ line 204 ~ slateToAPI ~ leaves", leaves)
  // Iterate over all the leaves.
  for (let leaf of leaves) {

    const start = pos;
    const charCount = codePointLength(leaf.value);
    const end = start + charCount;

    // Here in real implementation you'd have to determine all the layers
    // this leaf can be part of. This implies knowing precisely the data model of all the nodes, and all the possible properties.
    // We could probably simplify this a bit, e.g. we could use a single `format` property which could be
    // a Set of format Enums, e.g. Set("strong", "emphasis"), instead of separate properties with a boolean.
    // FWIW: we never have {bold: false} or something like that anyway.
    if (leaf.strong) {
      layers.addSpan("strong", null, start, end);
    }

    if (leaf.emphasis) {
      layers.addSpan("emphasis", null, start, end);
    }

    if (leaf.underline) {
      layers.addSpan("underline", null, start, end);
    }

    if (leaf.strikethrough) {
      layers.addSpan("strikethrough", null, start, end);
    }

    if (leaf.superscript) {
      layers.addSpan("superscript", null, start, end);
    }

    if (leaf.subscript) {
      layers.addSpan("subscript", null, start, end);
    }

    if (leaf.url) {
      if (leaf.value == '\uFFFC') {
        layers.addSpan('embed', { url: leaf.url }, start, end)
      } else {
        layers.addSpan('link', { url: leaf.url }, start, end)
      }


    }

    // Apparently there's no buffer or a string builder option in javascript, and there's nothing better than straight +=.
    // Slate does the same for every key stroke, so I guess it's fine.
    out.text += leaf.value;
    pos += charCount;
  }

  let outLayers = layers.list();

  if (outLayers) {
    out.layers = outLayers
  }

  if (out.layers.length == 0) {
    delete out.layers
  }

  if (typeof out.attributes == 'undefined' || out.attributes == null) {
    delete out.attributes
  }

  return out;
}

function apiToSlate(blk: Block): any {
  const out = {
    id: blk.id,
    type: blk.type,
    // TODO: handle block attributes too. I guess we've lost
    // the "paragraph" type of the content node during the conversion ¯\_(ツ)_/¯.
    // Let's pretend it's there though.
    children: [
      {
        type: "paragraph",
        children: [],
      },
    ],
  };

  // NOTICE: It's a bit messy here, but it works.
  // Some of those helper function are not "pure", and use some of the variables
  // defined bellow. It can get a bit confusing, and definitely could be improved.

  // The basic idea here is that we iterate the text string from the API block
  // and we need to keep track of our current position. Both in UTF-16 code units
  // and Unicode Code Points. We use code point position to check it across all the
  // block layers. And we use the UTF-16 positions to extract the substring from the block text.

  // Store the pointer to the leaves array in the resulting block.
  // Just for convenience.
  const leaves = out.children[0].children;
  // Current leaf. At the beginning there's nothing.
  let leaf: any = null;
  // Start UTF-16 offset of the current leaf. It indicates the beginning
  // of the substring in the block text that would correspond to the current leaf.
  // to get the substring of the block text to insert it in the actual leaf.
  let textStart = 0;
  // Our current position in the UTF-16 string of the block text.
  // When we finish the current leaf, we use start, and this position
  // to extract the substring that belongs to the current leaf from the block text.
  let i = 0;
  // Last UTF-16 offset. Used to finish the last leaf. Otherwise we never get to
  // fill the leaf value.
  const stopPoint = blk.text.length - 1;
  // Code point position we're currently at. We check it across all the
  // block layers to determine where leafs should start and end.
  let pos = 0;
  // Here we track layers enabled for the current leaf.
  const leafLayers = new Set<Layer>();

  // Advances our position. Used after every iteration.
  // Accepts the number of code units to advance the UTF-16 position.
  // Mostly it is 1, but for surrogate pairs it's 2.
  const advance = (codeUnits: number) => {
    pos++;
    i += codeUnits;
  };

  // Creates a new leaf, and makes it current.
  // Uses layers current position belongs to.
  const startLeaf = (posLayers: Set<Layer>) => {
    leaf = {
      type: "text",
    };

    posLayers.forEach((l) => {
      // Here's we'd need to do something more sophisticated
      // to determine how different layers affect the leaf node.
      // We'd need to check the layer "identity", but I'm
      // checking only type here for brevity.
      if (l.type === "strong") {
        leaf.strong = true;
      }

      if (l.type === "emphasis") {
        leaf.emphasis = true;
      }
    });
  };

  const finishLeaf = (low: number, high: number) => {
    leaf.value = blk.text.substring(low, high);
    textStart = high;
    leaves.push(leaf);
  };

  const trackPosLayers = (pos: number): boolean => {
    // Whenever we detect that layers of the current position are not the same as the ones for
    // the previous position, we change this to true, and use it to start a new leaf later.
    let layersChanged = false;

    // When position matches — we enable the layer for the current leaf.
    // When it doesn't match — we disable the layer for the current leaf.
    blk.layers.forEach((l) => {
      let spanIdx = l.contains(pos);
      if (spanIdx === -1) {
        // If the layer was in the set, we remove it and mark set as "dirty".
        if (leafLayers.delete(l)) {
          layersChanged = true;
        }
        return;
      }

      // If the layer was already enabled we continue.
      if (leafLayers.has(l)) {
        return;
      }

      // Whenever we found a new layer that current position matches,
      // we add it to the set and mark te set as "dirty".
      leafLayers.add(l);
      layersChanged = true;
    });

    return layersChanged;
  };

  // Main loop that iterates over the block text string.
  // TODO: need to handle U+FFFC properly, and a lot more other edge cases.
  while (i < blk.text.length) {
    // This tracks how many UTF-16 code units we need to "consume", i.e. advance our position forward.
    // It's mostly 1, but we skip the second half of the surrogate pair when we see the first one.
    let ul = 1;
    if (isSurrogate(blk.text, i)) {
      ul++;
    }

    // We have to check each code point position whether it belongs to any of the layers of the block.
    let layersChanged = trackPosLayers(pos);

    // When we reach the stop point, we need to finish the current leaf before returning.
    if (i == stopPoint) {
      finishLeaf(textStart, i + 1);
      return out;
    }

    // On the first iteration we won't have the leaf.
    if (!leaf) {
      startLeaf(leafLayers);
      advance(ul);
      continue;
    }

    // When layers change we need to finish the current leaf and start the new one.
    if (layersChanged) {
      finishLeaf(textStart, i);
      startLeaf(leafLayers);
    }

    advance(ul);
  }

  // We should never get here, because we would returned when we reach the stop point.
  throw Error("BUG: should not get here");
}

// Count code points in a UTF-16 string.
function codePointLength(str: string): number {
  let count = 0;
  for (let i = 0; i < str.length; i++) {
    count++;

    if (isSurrogate(str, i)) {
      i++;
    }
  }
  return count;
}

// Checks if a UTF-16 code unit i in string s is start of a surrogate pair.
function isSurrogate(s: string, i: number): boolean {
  const code = s.charCodeAt(i);
  return 0xd800 <= code && code <= 0xdbff;
}

function flattenLeaves(leaves: Array<any>): Array<any> {
  let result = []


  for (let i = 0; i < leaves.length; i++) {
    let leaf = leaves[i].children
    if (typeof leaf != 'undefined') {
      if (leaves[i].type == 'embed') {
        // we are 100% sure that if the leave is an embed, there's only one child in the children's array. that's why we can create the only child with the url attribute.
        result.push({ ...leaf[0], url: leaves[i].url, value: '\uFFFC' })
      } else {
        // add the url attribute to all link's children
        let nestedResult = flattenLeaves(leaf).map(l => ({
          ...l,
          url: leaves[i].url
        }))
        result.push(...nestedResult)
      }
    } else {
      result.push(leaves[i])
    }
  }
  return result
}