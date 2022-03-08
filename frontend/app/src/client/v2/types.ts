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
export class Layer {
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
export class LayerSet {
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

// Checks if a position expressed in code points is within any of the span
// of this layer.
// It assumes starts and ends array are valid span values, and are sorted,
// because it's implemented as a binary search.
// It returns array index of the span the position matches.
// Otherwise it returns -1.
export function layerContains(layer: Layer, pos: number): number {
  let low = 0;
  let high = layer.starts.length - 1;
  let mid = 0;

  while (low <= high) {
    mid = Math.floor((low + high) / 2);
    // Binary search. If the midpoint span ends before the position
    // we're checking — we drop the left side of the array entirely.
    if (layer.ends[mid] <= pos) {
      low = mid + 1;
    } else {
      high = mid - 1;
    }
  }

  if (low == layer.starts.length) {
    return -1;
  }

  if (layer.starts[low] <= pos && pos < layer.ends[low]) {
    return low;
  }

  return -1;
}