import {BlockWrapper} from '@app/editor/block-wrapper'
import {changesService} from '@app/editor/mintter-changes/plugin'
import {EditorMode} from '@app/editor/plugin-utils'
import {css} from '@app/stitches.config'
import {Box} from '@components/box'
import {
  Blockquote as BlockquoteType,
  createId,
  FlowContent,
  isBlockquote,
  paragraph,
  statement,
  text,
} from '@mintter/mttast'
import {Editor, Path, Transforms} from 'slate'
import {RenderElementProps} from 'slate-react'
import {statementStyle} from '../statement'
import type {EditorPlugin} from '../types'
import {resetFlowContent} from '../utils'

export const ELEMENT_BLOCKQUOTE = 'blockquote'

export const createBlockquotePlugin = (): EditorPlugin => ({
  name: ELEMENT_BLOCKQUOTE,
  configureEditor(editor) {
    if (editor.readOnly) return
    const {deleteBackward} = editor

    editor.deleteBackward = (unit) => {
      if (resetFlowContent(editor)) return
      deleteBackward(unit)
    }

    return editor
  },
  renderElement:
    (editor) =>
    ({attributes, children, element}) => {
      if (isBlockquote(element)) {
        return (
          <BlockQuote
            mode={editor.mode}
            element={element}
            attributes={attributes}
          >
            {children}
          </BlockQuote>
        )
      }
    },
  onKeyDown: (editor) => {
    if (editor.readOnly) return
    return (ev) => {
      if (ev.key == 'Enter') {
        const quote = Editor.above(editor, {match: isBlockquote})
        if (quote) {
          ev.preventDefault()
          const [, quotePath] = quote
          Editor.withoutNormalizing(editor, () => {
            let newBlock = statement({id: createId()}, [paragraph([text('')])])
            Transforms.insertNodes(editor, newBlock, {
              at: Path.next(quotePath),
            })
            Transforms.select(editor, Path.next(quotePath))
            Transforms.collapse(editor, {edge: 'start'})
            changesService.addChange(['moveBlock', newBlock.id])
          })
        }
      }
    }
  },
})

export var blockquoteStyle = css(statementStyle, {
  paddingLeft: '$3',
  borderLeft: '2px solid $colors$primary-border-normal',
})

function BlockQuote({
  element,
  attributes,
  children,
  mode,
}: RenderElementProps & {mode: EditorMode}) {
  let blockProps = {
    'data-element-type': element.type,
    'data-element-id': (element as BlockquoteType).id,
    ...attributes,
  }

  if (mode == EditorMode.Embed || mode == EditorMode.Mention) {
    return <span {...blockProps}>{children}</span>
  }

  return (
    <BlockWrapper
      element={element as FlowContent}
      attributes={attributes}
      mode={mode}
    >
      <Box className={blockquoteStyle()} {...blockProps}>
        {children}
      </Box>
    </BlockWrapper>
  )
}
