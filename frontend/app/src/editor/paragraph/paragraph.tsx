import {useFile, useFileEditor} from '@app/file-provider'
import {css} from '@app/stitches.config'
import {Box} from '@components/box'
import {
  FlowContent,
  isBlockquote,
  isCode,
  isFlowContent,
  isParagraph,
  isPhrasingContent,
} from '@mintter/mttast'
import {Editor, Node, Path, Transforms} from 'slate'
import {RenderElementProps} from 'slate-react'
import {useHover, useHoverActiveSelector} from '../hover-context'
import {EditorMode} from '../plugin-utils'
import type {EditorPlugin} from '../types'
import {findPath, useParentGroup} from '../utils'

export const ELEMENT_PARAGRAPH = 'paragraph'

export const paragraphStyles = css({
  fontFamily: '$alt',
  margin: 0,
  padding: 0,
  lineHeight: '$4',
  '[data-parent-type=blockquote] &': {
    fontStyle: 'italic',
    color: '$base-text-low',
    borderLeft: '2px solid $colors$primary-border-normal',
    marginVertical: '$4',
  },
  '[data-parent-type=code] &': {
    fontFamily: 'monospace',
    margin: 0,
    backgroundColor: '$base-component-bg-normal',
    paddingHorizontal: '$4',
    paddingVertical: '$3',
    marginVertical: '$4',
  },
})
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
}: RenderElementProps & {mode: EditorMode}) {
  const editor = useFileEditor()
  let fileRef = useFile()
  const path = findPath(element)
  const [parentNode, parentPath] = Editor.parent(editor, path)
  if (!isFlowContent(parentNode)) {
    console.log('NOT A BLOCK PARENT!', parentNode, parentPath)
  }
  const hoverService = useHover()
  let isHoverActive = useHoverActiveSelector()
  const parentGroup = useParentGroup(editor, path)

  let as =
    mode == EditorMode.Embed || mode == EditorMode.Mention
      ? 'span'
      : isCode(parentNode)
      ? 'span'
      : isBlockquote(parentNode)
      ? 'blockquote'
      : parentGroup == 'orderedList' || parentGroup == 'unorderedList'
      ? 'li'
      : 'p'

  return (
    <Box
      {...attributes}
      as={
        mode != EditorMode.Draft && mode != EditorMode.Publication
          ? 'span'
          : 'div'
      }
      onMouseEnter={() => {
        hoverService.send({type: 'MOUSE_ENTER', blockId: parentNode.id})
      }}
      css={{
        paddingLeft:
          mode == EditorMode.Draft || mode == EditorMode.Publication
            ? `${parentPath.length * 16}px`
            : 0,
        transition: 'all ease-in-out 0.1s',
        backgroundColor: 'transparent',
        userSelect: 'none',
        [`[data-hover-block="${(parentNode as FlowContent).id}"] &`]: {
          backgroundColor:
            editor.mode != EditorMode.Draft
              ? '$primary-component-bg-normal'
              : isHoverActive
              ? '$primary-component-bg-normal'
              : 'transparent',
        },
      }}
      data-element-type={element.type}
      data-parent-type={(parentNode as FlowContent)?.type}
    >
      <Box
        as={as}
        className={paragraphStyles()}
        css={{
          width: '$full',
          maxWidth: '$prose-width',
          userSelect: 'text',
          lineHeight: '$3',
          display:
            mode == EditorMode.Embed
              ? 'inline'
              : parentGroup == 'orderedList' || parentGroup == 'unorderedList'
              ? 'list-item'
              : 'inherit',
          marginLeft:
            mode == EditorMode.Embed
              ? 0
              : parentGroup == 'orderedList' || parentGroup == 'unorderedList'
              ? 24
              : 0,
          paddingLeft: isBlockquote(parentNode) ? 24 : 0,
          '&::marker': {
            color: '$base-text-low',
            fontSize: '$2',
          },
        }}
      >
        {children}
      </Box>
    </Box>
  )
}
