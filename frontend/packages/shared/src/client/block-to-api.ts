import {Block} from './.generated/documents/v1alpha/documents_pb'
import {AnnotationSet} from './classes'
import {FlowContent} from '../mttast'

// This example only deals with a single level of leaves.
// You'd need to think about something for multiple annotations,
// like `codeblock(text, text, link(text, text))` or something like that.
export function blockToApi(
  slateBlock: FlowContent,
  childrenType?: string,
  start?: number,
): Block {
  // this is to flatten the links into its underlying leaves passing all the attributes (the url) to them.
  // the first child of a block can be either typeof `paragraph`, `image`, `video` or `file`.

  let leaves = flattenLeaves(
    isMediaBlock(slateBlock)
      ? slateBlock.children
      : slateBlock.children[0].children,
  )

  // eslint-disable-next-line
  const {type, id, children, revision, ...attributes} = slateBlock

  // const out = new Block(slateBlock.id, slateBlock.type);
  const out: Block = {
    id,
    type,
    annotations: [],
    // @ts-ignore
    attributes,
    text: '',
  }

  if (revision) {
    out.revision = revision
  } else {
    // no revision!
  }

  if (childrenType) {
    out.attributes.childrenType = childrenType
  }

  if (start) {
    out.attributes.start = String(start)
  }

  const annotations = new AnnotationSet()

  // We'll have to count our current position in code points.
  let pos = 0
  // Iterate over all the leaves.
  for (let leaf of leaves) {
    const start = pos
    const charCount = codePointLength(leaf.text)
    const end = start + charCount

    // Here in real implementation you'd have to determine all the annotations
    // this leaf can be part of. This implies knowing precisely the data model of all the nodes, and all the possible properties.
    // We could probably simplify this a bit, e.g. we could use a single `format` property which could be
    // a Set of format Enums, e.g. Set("strong", "emphasis"), instead of separate properties with a boolean.
    // FWIW: we never have {bold: false} or something like that anyway.
    if (leaf.strong) {
      annotations.addSpan('strong', null, start, end)
    }

    if (leaf.emphasis) {
      annotations.addSpan('emphasis', null, start, end)
    }

    if (leaf.underline) {
      annotations.addSpan('underline', null, start, end)
    }

    if (leaf.strikethrough) {
      annotations.addSpan('strikethrough', null, start, end)
    }

    if (leaf.superscript) {
      annotations.addSpan('superscript', null, start, end)
    }

    if (leaf.subscript) {
      annotations.addSpan('subscript', null, start, end)
    }

    if (leaf.code) {
      annotations.addSpan('code', null, start, end)
    }

    if (leaf.color) {
      annotations.addSpan('color', {color: leaf.color}, start, end)
    }

    if (leaf.conversations) {
      if (Array.isArray(leaf.conversations)) {
        leaf.conversations.forEach((conversationId: string) => {
          annotations.addSpan('conversation', {conversationId}, start, end)
        })
      }
    }

    // inline block elements check

    if (leaf.type == 'image') {
      annotations.addSpan('image', {url: leaf.url, alt: leaf.alt}, start, end)
    }

    if (leaf.type == 'video') {
      annotations.addSpan('video', {url: leaf.url, alt: leaf.alt}, start, end)
    }

    if (leaf.type == 'embed') {
      annotations.addSpan('embed', {url: leaf.url}, start, end)
    }

    if (leaf.type == 'link') {
      annotations.addSpan('link', {url: leaf.url}, start, end)
    }

    if (leaf.type == 'file') {
      annotations.addSpan('file', {url: leaf.url, name: leaf.name}, start, end)
    }

    // Apparently there's no buffer or a string builder option in javascript, and there's nothing better than straight +=.
    // Slate does the same for every key stroke, so I guess it's fine.
    out.text += leaf.text
    pos += charCount
  }

  let outAnnotations = annotations.list()

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

  return out
}

// Count code points in a UTF-16 string.
function codePointLength(str: string): number {
  let count = 0
  for (let i = 0; i < str.length; i++) {
    count++

    if (isSurrogate(str, i)) {
      i++
    }
  }
  return count
}

// Checks if a UTF-16 code unit i in string s is start of a surrogate pair.
function isSurrogate(s: string, i: number): boolean {
  const code = s.charCodeAt(i)
  return 0xd800 <= code && code <= 0xdbff
}
// eslint-disable-next-line
function flattenLeaves(leaves: Array<any>): Array<any> {
  let result = []

  for (let i = 0; i < leaves.length; i++) {
    let leaf = leaves[i].children
    if (typeof leaf != 'undefined') {
      if (
        leaves[i].type == 'paragraph' ||
        leaves[i].type == 'staticParagraph'
      ) {
        result.push(leaves[i].children[0])
      }

      if (leaves[i].type == 'image') {
        result.push({
          url: leaves[i].url ?? '',
          alt: leaves[i].alt ?? '',
          text: '\uFFFC',
          type: 'image',
        })
      }

      if (leaves[i].type == 'video') {
        result.push({
          url: leaves[i].url ?? '',
          alt: leaves[i].alt ?? '',
          text: '\uFFFC',
          type: 'video',
        })
      }

      if (leaves[i].type == 'file') {
        result.push({
          url: leaves[i].url ?? '',
          name: leaves[i].name ?? '',
          text: '\uFFFC',
          type: 'file',
        })
      }

      if (leaves[i].type == 'embed') {
        // we are 100% sure that if the leave is an embed, there's only one child in the children's array. that's why we can create the only child with the url attribute.
        result.push({
          ...leaf[0],
          type: 'embed',
          url: leaves[i].url,
          text: '\uFFFC',
        })
      }

      if (leaves[i].type == 'link') {
        // add the url attribute to all link's children
        let nestedResult = flattenLeaves(leaf).map((l) => ({
          ...l,
          url: leaves[i].url,
          type: 'link',
        }))
        result.push(...nestedResult)
      }
    } else {
      result.push(leaves[i])
    }
  }
  return result
}

function isMediaBlock(entry: FlowContent): boolean {
  let firstChild = entry.children[0]
  return ['image', 'video', 'file'].includes(firstChild.type)
}
