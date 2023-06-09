import {
  isContent,
  isFlowContent,
  isGroupContent,
  isHeading,
  isOrderedList,
  isParagraph,
  isStatement,
  ol,
  ul,
} from '@mintter/shared'

import {MintterEditor} from '@app/editor/mintter-changes/plugin'
import {Ancestor, Editor, Path, Range, Transforms} from 'slate'
import {ELEMENT_CODE} from './code'
import {ELEMENT_ORDERED_LIST, ELEMENT_UNORDERED_LIST} from './group'
import {ELEMENT_HEADING} from './heading'
import {ELEMENT_STATIC_PARAGRAPH} from './static-paragraph'
import {isFirstChild} from './utils'

const LANGUAGE_SHORTCUTS = {
  js: 'javascript',
  ts: 'typescript',
}

export function withMarkdownShortcuts(editor: Editor): Editor {
  const {insertText} = editor

  editor.insertText = (text) => {
    const {selection} = editor

    if (text == ' ' && selection && Range.isCollapsed(selection)) {
      if (!editor.selection) {
        console.warn('insertMarkdownList: no editor selection')
        return false
      }

      let content = editor.above({
        match: isContent,
      })

      if (!content) {
        console.warn('insertMarkdownList: no paragraph above')
        return false
      }

      let [, cPath] = content
      let start = editor.start(cPath)
      let range = {anchor: editor.selection.anchor, focus: start}
      const beforeText = editor.string(range)

      if (insertMarkdownList(editor, {beforeText, range})) return
      if (insertMarkdownHeading(editor, {beforeText, range})) return
      if (insertMarkdownCodeblock(editor, {beforeText, range})) return
    }
    insertText(text)
  }

  return editor
}

function insertMarkdownList(
  editor: Editor,
  {beforeText, range}: {beforeText: string; range: Range},
) {
  // if the text before the cursor has one of this characters,
  // that means the user wants to create a unordered list
  if (['-', '*', '+'].includes(beforeText)) {
    return insertListElement(editor, {
      beforeText,
      range,
      type: ELEMENT_UNORDERED_LIST,
    })
  }
  if (/^\d+\./.test(beforeText)) {
    return insertListElement(editor, {
      beforeText,
      range,
      type: ELEMENT_ORDERED_LIST,
    })
  }

  return false
}

function insertListElement(
  editor: Editor,
  {
    beforeText,
    range,
    type,
  }: {beforeText: string; range: Range; type: 'orderedList' | 'unorderedList'},
) {
  console.log('insertListElement', type)
  const currentBlock = editor.above({
    match: isStatement,
    mode: 'lowest',
  })

  if (!currentBlock) {
    console.warn('insertListElement: no flowContent above')
    return false
  }

  let [, cBlockPath] = currentBlock

  if (isFirstDocumentBlock(cBlockPath)) {
    console.warn(
      'insertListElement: changing the top level list is not implemented yet',
    )
    deleteContentAtRange(editor, range)
    return true
  }

  if (isFirstChild(cBlockPath)) {
    Editor.withoutNormalizing(editor, () => {
      Transforms.select(editor, range)
      Transforms.delete(editor)

      let newProps =
        type == 'orderedList' ? {type, start: parseInt(beforeText)} : {type}

      Transforms.setNodes(editor, newProps, {match: isGroupContent})
    })
    let groupParent = Editor.above(editor, {
      match: isFlowContent,
      mode: 'highest',
    })
    if (groupParent) {
      let [gpNode] = groupParent
      MintterEditor.addChange(editor, ['replaceBlock', gpNode.id])
    }
  } else {
    Editor.withoutNormalizing(editor, () => {
      Transforms.select(editor, range)
      Transforms.delete(editor)

      const [prev, prevPath] =
        Editor.previous<Ancestor>(editor, {at: cBlockPath}) || []

      if (!prev || !prevPath)
        throw new Error(
          '[markdown-plugin]: no prev or prevPath for ordered lists',
        )

      //@ts-ignore
      MintterEditor.addChange(editor, ['replaceBlock', prev.id])

      if (isGroupContent(prev.children[1])) {
        Transforms.moveNodes(editor, {
          at: cBlockPath,
          to: prevPath.concat(1, prev.children[1].children.length),
        })
      } else {
        if (type == 'orderedList') {
          Transforms.wrapNodes(editor, ol({start: parseInt(beforeText)}, []), {
            at: cBlockPath,
          })
        } else {
          Transforms.wrapNodes(editor, ul([]), {
            at: cBlockPath,
          })
        }

        Transforms.moveNodes(editor, {
          at: cBlockPath,
          to: prevPath.concat(1),
        })
      }
    })
  }
  return true
}

function insertMarkdownHeading(
  editor: Editor,
  {beforeText, range}: {beforeText: string; range: Range},
) {
  if (beforeText != '#') {
    return false
  }
  const currentBlock = Editor.above(editor, {
    match: (n) => isFlowContent(n) && !isHeading(n),
    mode: 'lowest',
  })

  if (!currentBlock) {
    console.warn('insertMarkdownHeading: no block above selection')
    return false
  }

  let [, cPath] = currentBlock
  editor.withoutNormalizing(() => {
    deleteContentAtRange(editor, range)

    editor.setNodes({type: ELEMENT_HEADING}, {at: cPath})
    editor.setNodes(
      //@ts-ignore
      {type: ELEMENT_STATIC_PARAGRAPH},
      {at: [...cPath, 0]},
    )
  })
  return true
}

function insertMarkdownCodeblock(
  editor: Editor,
  {beforeText, range}: {beforeText: string; range: Range},
) {
  if (!/```\w*/.test(beforeText)) return false
  const lang =
    //@ts-ignore
    LANGUAGE_SHORTCUTS[beforeText.slice(3)] || beforeText.slice(3) || undefined
  const currentBlock = Editor.above(editor, {
    match: isStatement,
    mode: 'lowest',
  })

  if (!currentBlock) {
    console.warn('insertMarkdownHeading: no block above selection')
    return false
  }

  let [, cPath] = currentBlock

  editor.withoutNormalizing(() => {
    deleteContentAtRange(editor, range)
    Transforms.setNodes(
      editor,
      //@ts-ignore
      {type: ELEMENT_CODE, lang},
      {match: isStatement, at: cPath},
    )
  })
  return true
}

function deleteContentAtRange(editor: Editor, range: Range) {
  Transforms.select(editor, range)
  Transforms.delete(editor)
}

function isFirstDocumentBlock(path: Path): boolean {
  return Path.equals(path, [0, 0])
}
