import {useBlockTools} from '@app/editor/block-tools-context'
import {usePhrasingProps} from '@app/editor/editor-node-props'
import {phrasingStyles} from '@app/editor/styles'
import {Box} from '@components/box'
import {
  isBlockquote,
  isCode,
  isParagraph,
  isPhrasingContent,
  Paragraph as ParagraphType,
} from '@mintter/mttast'
import {useEffect} from 'react'
import {Node, Path, Transforms} from 'slate'
import {RenderElementProps} from 'slate-react'
import {EditorMode} from '../plugin-utils'
import type {EditorPlugin} from '../types'

export const ELEMENT_PARAGRAPH = 'paragraph'

export const createParagraphPlugin = (): EditorPlugin => ({
  name: ELEMENT_PARAGRAPH,
  renderElement:
    (editor) =>
    ({element, children, attributes}) => {
      if (isParagraph(element)) {
        return (
          <Paragraph
            mode={editor.mode}
            element={element}
            attributes={attributes}
          >
            {children}
          </Paragraph>
        )
      }
    },
  configureEditor: (editor) => {
    const {normalizeNode} = editor

    editor.normalizeNode = (entry) => {
      const [node, path] = entry

      if (isParagraph(node)) {
        for (const [child, childPath] of Node.children(editor, path)) {
          if (!isPhrasingContent(child)) {
            Transforms.moveNodes(editor, {at: childPath, to: Path.next(path)})
            return
          }
        }
      }

      normalizeNode(entry)
    }

    return editor
  },
})

function Paragraph({
  children,
  element,
  attributes,
  mode,
}: RenderElementProps & {mode: EditorMode; element: ParagraphType}) {
  let btService = useBlockTools()
  let {elementProps, parentNode} = usePhrasingProps(element)

  useEffect(() => {
    if (attributes.ref.current) {
      console.log('CURRENT IS NEW')

      btService.send({type: 'ENTRY.OBSERVE', entry: attributes.ref.current})
    }
  }, [attributes.ref.current])

  if (mode == EditorMode.Embed || mode == EditorMode.Mention) {
    return (
      <span {...attributes} {...elementProps}>
        {children}
      </span>
    )
  }

  if (isCode(parentNode)) {
    return (
      <Box
        as="pre"
        className={phrasingStyles({blockType: 'code', type: 'paragraph'})}
        {...attributes}
        {...elementProps}
      >
        <code>{children}</code>
      </Box>
    )
  }

  if (isBlockquote(parentNode)) {
    return (
      <blockquote
        {...attributes}
        {...elementProps}
        className={phrasingStyles({
          type: 'paragraph',
          blockType: 'blockquote',
        })}
      >
        {children}
      </blockquote>
    )
  }

  return (
    <p
      className={phrasingStyles({
        type: 'paragraph',
        blockType: parentNode?.type,
      })}
      {...attributes}
      {...elementProps}
    >
      {children}
    </p>
  )
}
