import {isBlockquote} from '@mintter/mttast'
import {styled} from '@mintter/ui/stitches.config'
import {statementStyle} from '../statement'
import {StatementTools} from '../statement-tools'
import type {EditorPlugin} from '../types'
import {resetFlowContent} from '../utils'

export const ELEMENT_BLOCKQUOTE = 'blockquote'

// TODO: add dragger + new grid styles

export const BlockQuote = styled('li', statementStyle, {
  marginTop: '$6',
  marginBottom: '$6',

  '& [data-element-type=paragraph]': {
    borderRadius: '$2',
    paddingVertical: '$4',
    marginHorizontal: '$2',
    paddingLeft: '$5',
    position: 'relative',
    fontStyle: 'italic',
    color: '$text-alt',
    '&::before': {
      content: '""',
      position: 'absolute',
      left: 0,
      top: 0,
      transform: 'translateX(-4px)',
      width: 4,
      borderRadius: '$2',
      height: '$full',
      backgroundColor: '$primary-soft',
    },
  },
})

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
    () =>
    ({attributes, children, element}) => {
      if (isBlockquote(element)) {
        return (
          <BlockQuote data-element-type={element.type} {...attributes}>
            <StatementTools element={element} />
            {children}
          </BlockQuote>
        )
      }
    },
})
