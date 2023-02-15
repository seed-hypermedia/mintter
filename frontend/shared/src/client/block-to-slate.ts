import {
  Annotation,
  Block,
  BlockNode,
} from './.generated/documents/v1alpha/documents_pb'
import {
  GroupingContent,
  Text,
  FlowContent,
  group,
  isText,
  ol,
  PhrasingContent,
  ul,
} from '../mttast'
import {annotationContains} from './classes'

export function blockToSlate(blk: Block): FlowContent {
  // we dont need to pass `childrenType to `out`, but we don't need it for anything for now.
  // eslint-disable-next-line
  const {childrenType, ...attributes} = blk.attributes || {}
  const blockText = blk.text || ''
  const out = {
    id: blk.id,
    type: blk.type,
    revision: blk.revision,
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
  let leaf: Text | null = null
  // eslint-disable-next-line
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
  const stopPoint = blockText.length - 1
  // Code point position we're currently at. We check it across all the
  // block annotations to determine where leafs should start and end.
  let pos = 0
  // Here we track annotations enabled for the current leaf.
  const leafAnnotations = new Set<Annotation>()

  // if there's no text in the block, early return it
  if (blockText == '') {
    leaves.push({type: 'text', text: blockText})
    return out as FlowContent
  }

  // Main loop that iterates over the block text string.
  // TODO: need to handle U+FFFC properly, and a lot more other edge cases.
  while (i < blockText.length) {
    // This tracks how many UTF-16 code units we need to "consume", i.e. advance our position forward.
    // It's mostly 1, but we skip the second half of the surrogate pair when we see the first one.
    let ul = 1

    // We have to check each code point position whether it belongs to any of the annotations of the block.
    let annotationsChanged = trackPosAnnotations(pos)

    let surrogate = isSurrogate(blockText, i)
    if (surrogate) {
      ul++

      let onlyOneSurrogate = pos + ul
      if (onlyOneSurrogate == blockText.length) {
        // we enter here if the only character in the block is a Surrogate,
        // This means that we need to wrap up the transformation (same as in the end of the while loop)
        if (!leaf) {
          startLeaf(leafAnnotations)
        }

        finishLeaf(textStart, i + 2)

        if (inlineBlockContent) {
          if (!isText(leaves[leaves.length - 1])) {
            leaves.push({type: 'text', text: ''})
          }
          leaves.push(inlineBlockContent)
          leaves.push({type: 'text', text: ''})
          inlineBlockContent = null
        }
        return out as FlowContent
      }
    }

    // When we reach the stop point, we need to finish the current leaf before returning.
    if (stopPoint < 0) {
      console.warn('STOP IS LESS THAN ZERO', blk)
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
          leaves.push({type: 'text', text: ''})
        }
        leaves.push(inlineBlockContent)
        leaves.push({type: 'text', text: ''})
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

    // we check here if the new value of `i` is the same as the text's block length.
    // This means that th last character is Surrogate, and we just finished the transformation
    if (i == blockText.length) {
      finishLeaf(textStart, i)
      return out as FlowContent
    }
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
      text: '',
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
        // @ts-ignore
        leaf[l.type] = true
      }

      if (l.type === 'color') {
        // @ts-ignore
        leaf['color'] = l.attributes.color
      }
      if (l.type == 'conversation') {

        if (leaf && Array.isArray(leaf.conversations)) {
          if (!leaf.conversations.includes(l.attributes.conversationId)) {
            leaf!['conversations'].push(l.attributes.conversationId)
          }
        } else {
          leaf!['conversations'] = [l.attributes.conversationId]
        }
      }
    })

    if (linkAnnotation) {
      if (inlineBlockContent) {
        if (linkChangedIdentity(linkAnnotation)) {
          if (!isText(leaves[leaves.length - 1])) {
            leaves.push({type: 'text', text: ''})
          }
          leaves.push(inlineBlockContent)
          leaves.push({type: 'text', text: ''})
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
          leaves.push({type: 'text', text: ''})
        }
        leaves.push(inlineBlockContent)
        leaves.push({type: 'text', text: ''})
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
    let newValue = blockText.substring(low, high)
    if (leaf) leaf.text = newValue

    textStart = high

    if (inlineBlockContent) {
      if (inlineBlockContent.type == 'link') {
        inlineBlockContent.children.push(leaf)
      } else {
        inlineBlockContent.children.push({...leaf, text: ''})
      }
    } else {
      if (leaf) {
        leaves.push(leaf)
      }
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
  var code = s.charCodeAt(i)
  var res = 0xd800 <= code && code <= 0xdbff
  return res
}

type childrenType = 'group' | 'unorderedList' | 'orderedList'

export function blockNodeToSlate(
  entry: Array<BlockNode>,
  childrenType: childrenType = 'group',
  start: string = '1',
): GroupingContent {
  let fn =
    childrenType === 'orderedList'
      ? ol
      : childrenType === 'unorderedList'
      ? ul
      : group
  let res = fn(
    entry.map(({block, children}) => {
      // TODO(horacio): fix types, block should always be a block, not undefined
      // @ts-ignore
      let slateBlock = blockToSlate(block)
      if (children?.length) {
        slateBlock.children[1] = blockNodeToSlate(
          children,
          block?.attributes?.childrenType as childrenType,
          block?.attributes?.start,
        )
      }
      return slateBlock
    }),
  )

  if (start) {
    // @ts-ignore
    res.start = start
  }
  return res
}
