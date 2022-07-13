import {GroupingContent} from '@mintter/mttast'
// import { toSlateMachine } from "@app/client/v2/block-to-slate-machine";
import {Annotation, Block, BlockNode} from '@app/client'
import {debug} from '@app/utils/logger'
import {
  FlowContent,
  group,
  isText,
  ol,
  PhrasingContent,
  ul,
} from '@mintter/mttast'
// import { interpret } from "xstate";
import {annotationContains} from './classes'

export function blockToSlate(blk: Block): FlowContent {
  const {childrenType: _, ...attributes} = blk.attributes

  const out = {
    id: blk.id,
    type: blk.type,
    ...attributes,
    // TODO: handle block attributes too. I guess we've lost
    // the "paragraph" type of the content node during the conversion ¯\_(ツ)_/¯.
    // Let's pretend it's there though.
    children: [
      {
        type: blk.type == 'heading' ? 'staticParagraph' : 'paragraph',
        children: [] as Array<PhrasingContent>,
      },
    ],
  }

  // NOTICE: It's a bit messy here, but it works.
  // Some of those helper function are not "pure", and use some of the variables
  // defined bellow. It can get a bit confusing, and definitely could be improved.

  // The basic idea here is that we iterate the text string from the API block
  // and we need to keep track of our current position. Both in UTF-16 code units
  // and Unicode Code Points. We use code point position to check it across all the
  // block annotations. And we use the UTF-16 positions to extract the substring from the block text.

  // Store the pointer to the leaves array in the resulting block.
  // Just for convenience.
  const leaves = out.children[0].children
  // Current leaf. At the beginning there's nothing.
  let leaf: any = null
  let inlineBlockContent: any = null
  // Start UTF-16 offset of the current leaf. It indicates the beginning
  // of the substring in the block text that would correspond to the current leaf.
  // to get the substring of the block text to insert it in the actual leaf.
  let textStart = 0
  // Our current position in the UTF-16 string of the block text.
  // When we finish the current leaf, we use start, and this position
  // to extract the substring that belongs to the current leaf from the block text.
  let i = 0
  // Last UTF-16 offset. Used to finish the last leaf. Otherwise we never get to
  // fill the leaf value.
  const stopPoint = blk.text.length - 1
  // Code point position we're currently at. We check it across all the
  // block annotations to determine where leafs should start and end.
  let pos = 0
  // Here we track annotations enabled for the current leaf.
  const leafAnnotations = new Set<Annotation>()

  if (blk.text == '') {
    leaves.push({type: 'text', value: blk.text})
    return out as FlowContent
  }

  // Main loop that iterates over the block text string.
  // TODO: need to handle U+FFFC properly, and a lot more other edge cases.
  while (i < blk.text.length) {
    // This tracks how many UTF-16 code units we need to "consume", i.e. advance our position forward.
    // It's mostly 1, but we skip the second half of the surrogate pair when we see the first one.
    let ul = 1
    let surrogate = isSurrogate(blk.text, i)
    if (surrogate) {
      ul++
    }

    // We have to check each code point position whether it belongs to any of the annotations of the block.
    let annotationsChanged = trackPosAnnotations(pos)

    // When we reach the stop point, we need to finish the current leaf before returning.
    if (stopPoint < 0) {
      debug('STOP IS LESS THAN ZERO', blk)
    }
    if (i == stopPoint) {
      if (annotationsChanged) {
        if (leaf) {
          finishLeaf(textStart, i)
        }
        startLeaf(leafAnnotations)
      } else {
        startLeaf(leafAnnotations)
      }

      finishLeaf(textStart, i + 1)

      if (inlineBlockContent) {
        if (!isText(leaves[leaves.length - 1])) {
          leaves.push({type: 'text', value: ''})
        }
        leaves.push(inlineBlockContent)
        leaves.push({type: 'text', value: ''})
        inlineBlockContent = null
      }

      return out as FlowContent
    }

    // On the first iteration we won't have the leaf.
    if (!leaf) {
      startLeaf(leafAnnotations)
      advance(ul)
      continue
    }

    // When annotations change we need to finish the current leaf and start the new one.
    if (annotationsChanged) {
      finishLeaf(textStart, i)
      startLeaf(leafAnnotations)
    }

    advance(ul)
  }

  // We should never get here, because we would returned when we reach the stop point.
  throw Error('BUG: should not get here')

  // Advances our position. Used after every iteration.
  // Accepts the number of code units to advance the UTF-16 position.
  // Mostly it is 1, but for surrogate pairs it's 2.
  function advance(codeUnits: number) {
    pos++
    i += codeUnits
  }

  // Creates a new leaf, and makes it current.
  // Uses annotations current position belongs to.
  function startLeaf(posAnnotations: Set<Annotation>) {
    leaf = {
      type: 'text',
    }

    // this var keeps track if in the current annotations there's a link or embed annotation or not. this is important to make sure we are adding items to the correct array
    let linkAnnotation: Annotation | null = null

    posAnnotations.forEach((l) => {
      // Here's we'd need to do something more sophisticated
      // to determine how different annotations affect the leaf node.
      // We'd need to check the annotation "identity", but I'm
      // checking only type here for brevity.
      if (['link', 'embed', 'image', 'video'].includes(l.type)) {
        // TODO: modify leaf if is link or embed
        linkAnnotation = l
      }
      if (
        [
          'strong',
          'emphasis',
          'strikethrough',
          'underline',
          'superscript',
          'subscript',
          'code',
        ].includes(l.type)
      ) {
        leaf[l.type] = true
      }
    })

    if (linkAnnotation) {
      if (inlineBlockContent) {
        if (linkChangedIdentity(linkAnnotation)) {
          if (!isText(leaves[leaves.length - 1])) {
            leaves.push({type: 'text', value: ''})
          }
          leaves.push(inlineBlockContent)
          leaves.push({type: 'text', value: ''})
          inlineBlockContent = {
            type: (linkAnnotation as Annotation).type,
            ...(linkAnnotation as Annotation).attributes,
            children: [],
          }
        }
      } else {
        inlineBlockContent = {
          type: (linkAnnotation as Annotation).type,
          ...(linkAnnotation as Annotation).attributes,
          children: [],
        }
      }
    } else {
      if (inlineBlockContent) {
        if (!isText(leaves[leaves.length - 1])) {
          leaves.push({type: 'text', value: ''})
        }
        leaves.push(inlineBlockContent)
        leaves.push({type: 'text', value: ''})
        inlineBlockContent = null
      }
    }
  }

  function linkChangedIdentity(annotation: Annotation): boolean {
    if (!inlineBlockContent) return false
    let currentLink = inlineBlockContent.url
    return currentLink != annotation.attributes?.url
  }

  function finishLeaf(low: number, high: number) {
    let newValue = blk.text.substring(low, high)
    leaf.value = newValue

    textStart = high

    if (inlineBlockContent) {
      if (inlineBlockContent.type == 'link') {
        inlineBlockContent.children.push(leaf)
      } else {
        inlineBlockContent.children.push({...leaf, value: ''})
      }
    } else {
      leaves.push(leaf)
    }
  }

  function trackPosAnnotations(pos: number): boolean {
    // Whenever we detect that annotations of the current position are not the same as the ones for
    // the previous position, we change this to true, and use it to start a new leaf later.
    let annotationsChanged = false

    // early return if annotations does not exist
    if (!blk.annotations) return false

    // When position matches — we enable the annotation for the current leaf.
    // When it doesn't match — we disable the annotation for the current leaf.
    blk.annotations.forEach((l) => {
      let spanIdx = annotationContains(l, pos)
      if (spanIdx === -1) {
        // If the annotation was in the set, we remove it and mark set as "dirty".
        if (leafAnnotations.delete(l)) {
          annotationsChanged = true
        }
        return
      }

      // If the annotation was already enabled we continue.
      if (leafAnnotations.has(l)) {
        return
      }

      // Whenever we found a new annotation that current position matches,
      // we add it to the set and mark te set as "dirty".
      leafAnnotations.add(l)
      annotationsChanged = true
    })

    return annotationsChanged
  }
}

// Checks if a UTF-16 code unit i in string s is start of a surrogate pair.
function isSurrogate(s: string, i: number): boolean {
  const code = s.charCodeAt(i)
  return 0xd800 <= code && code <= 0xdbff
}

export function blockNodeToSlate(
  entry: Array<BlockNode>,
  childrenType: string,
): GroupingContent {
  // TODO: use the correct group type for the return here
  let fn =
    childrenType == 'orderedList'
      ? ol
      : childrenType == 'unorderedList'
      ? ul
      : group
  return fn(
    entry.map(({block, children}) => {
      let slateBlock = blockToSlate(block!)
      if (children.length) {
        slateBlock.children[1] = blockNodeToSlate(
          children,
          block?.attributes.childrenType || 'group',
        )
      }

      return slateBlock
    }),
  )
}
