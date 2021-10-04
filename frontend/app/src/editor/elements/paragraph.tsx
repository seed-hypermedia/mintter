import {isBlockquote, isCode, isParagraph} from '@mintter/mttast'
import {createId, statement} from '@mintter/mttast-builder'
import {styled} from '@mintter/ui/stitches.config'
import {Text} from '@mintter/ui/text'
import {Editor, Node, Path, Transforms} from 'slate'
import type {RenderElementProps} from 'slate-react'
import {ReactEditor, useSlateStatic} from 'slate-react'
import type {EditorPlugin} from '../types'

export const ELEMENT_PARAGRAPH = 'paragraph'

const ParagraphStyled = styled(Text, {
  '&[data-parent=code]': {
    fontFamily: 'monospace',
    margin: 0,
    padding: 0,
  },
  '&[data-parent=blockquote]': {
    borderRadius: '$2',
    paddingVertical: '$4',
    marginHorizontal: '$2',
    paddingLeft: '$8',
    position: 'relative',
    // backgroundColor: '$background-muted',
    fontStyle: 'italic',
    color: '$text-alt',
    fontSize: '$5',
    '&::before': {
      content: '',
      backround: 'red',
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

export const createParagraphPlugin = (): EditorPlugin => ({
  name: ELEMENT_PARAGRAPH,
  renderElement({element, children, attributes}) {
    if (isParagraph(element)) {
      return (
        <Paragraph element={element} attributes={attributes}>
          {children}
        </Paragraph>
      )
    }
  },
  configureEditor: (editor) => {
    const {normalizeNode, insertBreak} = editor

    editor.insertBreak = () => {
      insertBreak()
    }

    editor.normalizeNode = (entry) => {
      const [node, path] = entry
      if (isParagraph(node)) {
        if (Path.hasPrevious(path)) {
          const [parentNode] = Editor.parent(editor, path)
          const prevNode = Node.get(editor, Path.previous(path))
          if (isCode(parentNode)) {
            return
          }
          /*
           * @todo if the selection is in the beginning, then wrap the first paragraph with a new statement
           * @body Issue Body
           */
          let id = createId()
          Editor.withoutNormalizing(editor, () => {
            let targetPath = Editor.isEmpty(editor, prevNode) ? Path.previous(path) : path
            Transforms.wrapNodes(editor, statement({id}), {
              at: targetPath,
            })
            Transforms.setNodes(editor, {id: createId()}, {at: targetPath})
          })

          return
        }
      }
      normalizeNode(entry)
    }

    return editor
  },
})

function Paragraph({children, element, attributes}: RenderElementProps) {
  const editor = useSlateStatic()
  const path = ReactEditor.findPath(editor, element)
  const [parentNode] = Editor.parent(editor, path)

  return (
    <ParagraphStyled
      as={isCode(parentNode) ? 'span' : isBlockquote(parentNode) ? 'blockquote' : 'p'}
      alt
      size="4"
      css={{paddingLeft: '$2'}}
      data-parent={parentNode?.type ?? null}
      {...attributes}
    >
      {children}
    </ParagraphStyled>
  )
}
