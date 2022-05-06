import { Annotation, Block } from '@app/client';
import { FlowContent } from "@mintter/mttast";
import { annotationContains, AnnotationSet } from './classes';

// This example only deals with a single level of leaves.
// You'd need to think about something for multiple annotations,
// like `codeblock(text, text, link(text, text))` or something like that.
export function blockToApi(slateBlock: FlowContent): Block {

  // this is to flatten the links into its underlying leaves passing all the attributes (the url) to them.
  let leaves = flattenLeaves(slateBlock.children[0].children)

  // const out = new Block(slateBlock.id, slateBlock.type);
  const out: Block = {
    id: slateBlock.id,
    type: slateBlock.type,
    annotations: [],
    attributes: {},
    text: ""
  }

  const annotations = new AnnotationSet();

  // We'll have to count our current position in code points.
  let pos = 0;
  // Iterate over all the leaves.
  for (let leaf of leaves) {

    const start = pos;
    const charCount = codePointLength(leaf.value);
    const end = start + charCount;

    // Here in real implementation you'd have to determine all the annotations
    // this leaf can be part of. This implies knowing precisely the data model of all the nodes, and all the possible properties.
    // We could probably simplify this a bit, e.g. we could use a single `format` property which could be
    // a Set of format Enums, e.g. Set("strong", "emphasis"), instead of separate properties with a boolean.
    // FWIW: we never have {bold: false} or something like that anyway.
    if (leaf.strong) {
      annotations.addSpan("strong", null, start, end);
    }

    if (leaf.emphasis) {
      annotations.addSpan("emphasis", null, start, end);
    }

    if (leaf.underline) {
      annotations.addSpan("underline", null, start, end);
    }

    if (leaf.strikethrough) {
      annotations.addSpan("strikethrough", null, start, end);
    }

    if (leaf.superscript) {
      annotations.addSpan("superscript", null, start, end);
    }

    if (leaf.subscript) {
      annotations.addSpan("subscript", null, start, end);
    }

    if (leaf.url) {
      if (leaf.value == '\uFFFC') {
        annotations.addSpan('embed', { url: leaf.url }, start, end)
      } else {
        annotations.addSpan('link', { url: leaf.url }, start, end)
      }


    }

    // Apparently there's no buffer or a string builder option in javascript, and there's nothing better than straight +=.
    // Slate does the same for every key stroke, so I guess it's fine.
    out.text += leaf.value;
    pos += charCount;
  }

  let outAnnotations = annotations.list();

  if (outAnnotations) {
    out.annotations = outAnnotations
  }

  if (Object.keys(out.attributes).length == 0) {
    //@ts-ignore
    delete out.attributes
  }

  if (out.annotations.length == 0) {
    //@ts-ignore
    delete out.annotations
  }

  if (typeof out.attributes == 'undefined' || out.attributes == null) {
    //@ts-ignore
    delete out.attributes
  }

  return out;
}

function apiToSlate(blk: Block): any {
  //@ts-ignore
  const out: FlowContent = {
    id: blk.id,
    type: (blk.type as FlowContent['type']),
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
  // block annotations. And we use the UTF-16 positions to extract the substring from the block text.

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
  // block annotations to determine where leafs should start and end.
  let pos = 0;
  // Here we track annotations enabled for the current leaf.
  const leafAnnotations = new Set<Annotation>();

  // Advances our position. Used after every iteration.
  // Accepts the number of code units to advance the UTF-16 position.
  // Mostly it is 1, but for surrogate pairs it's 2.
  const advance = (codeUnits: number) => {
    pos++;
    i += codeUnits;
  };

  // Creates a new leaf, and makes it current.
  // Uses annotations current position belongs to.
  const startLeaf = (posAnnotations: Set<Annotation>) => {
    leaf = {
      type: "text",
    };

    posAnnotations.forEach((l) => {
      // Here's we'd need to do something more sophisticated
      // to determine how different annotations affect the leaf node.
      // We'd need to check the annotation "identity", but I'm
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

  const trackPosAnnotations = (pos: number): boolean => {
    // Whenever we detect that annotations of the current position are not the same as the ones for
    // the previous position, we change this to true, and use it to start a new leaf later.
    let annotationsChanged = false;

    // When position matches — we enable the annotation for the current leaf.
    // When it doesn't match — we disable the annotation for the current leaf.
    blk.annotations.forEach((l) => {
      let spanIdx = annotationContains(l, pos)
      if (spanIdx === -1) {
        // If the annotation was in the set, we remove it and mark set as "dirty".
        if (leafAnnotations.delete(l)) {
          annotationsChanged = true;
        }
        return;
      }

      // If the annotation was already enabled we continue.
      if (leafAnnotations.has(l)) {
        return;
      }

      // Whenever we found a new annotation that current position matches,
      // we add it to the set and mark te set as "dirty".
      leafAnnotations.add(l);
      annotationsChanged = true;
    });

    return annotationsChanged;
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

    // We have to check each code point position whether it belongs to any of the annotations of the block.
    let annotationsChanged = trackPosAnnotations(pos);

    // When we reach the stop point, we need to finish the current leaf before returning.
    if (i == stopPoint) {
      finishLeaf(textStart, i + 1);
      return out;
    }

    // On the first iteration we won't have the leaf.
    if (!leaf) {
      startLeaf(leafAnnotations);
      advance(ul);
      continue;
    }

    // When annotations change we need to finish the current leaf and start the new one.
    if (annotationsChanged) {
      finishLeaf(textStart, i);
      startLeaf(leafAnnotations);
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