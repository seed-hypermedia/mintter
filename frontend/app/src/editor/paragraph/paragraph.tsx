import {usePhrasingProps} from '@app/editor/editor-node-props'
import {useBlockObserve, useMouse} from '@app/mouse-context'
import {useDrag} from '@app/drag-context'
import {mergeRefs} from '@app/utils/mege-refs'
import {Box} from '@components/box'
import {
  FlowContent,
  isBlockquote,
  isCode,
  isFlowContent,
  isParagraph,
  isPhrasingContent,
  Paragraph as ParagraphType,
} from '@mintter/shared'
import {useEffect, useMemo, useRef} from 'react'
import {Editor, Node, Path, Transforms} from 'slate'
import {ReactEditor, RenderElementProps, useSlate} from 'slate-react'
import {EditorMode} from '../plugin-utils'
import type {EditorPlugin} from '../types'
import {red} from '@radix-ui/colors'
import {useActor, useSelector} from '@xstate/react'

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
            console.log('moving phrasing content', child, childPath)
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
  let editor = useSlate()
  let {elementProps, parentNode, parentPath} = usePhrasingProps(editor, element)
  // dragProps
  let pRef = useRef<HTMLElement | undefined>()
  let otherProps = {
    ref: mergeRefs([attributes.ref, pRef]),
  }
  useBlockObserve(mode, pRef)
  let mouseService = useMouse()
  let dragService = useDrag()

  let mouseProps =
    mode != EditorMode.Discussion
      ? {
          onMouseEnter: () => {
            mouseService.send({
              type: 'HIGHLIGHT.ENTER',
              ref: elementProps['data-highlight'] as string,
            })
          },
          onMouseLeave: () => {
            mouseService.send('HIGHLIGHT.LEAVE')
          },
        }
      : {}

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    // const domNode = ReactEditor.toDOMNode(editor, element)
    const path = ReactEditor.findPath(editor, element)

    const parentBlock = Editor.above<FlowContent>(editor, {
      match: isFlowContent,
      mode: 'lowest',
      at: path,
    })

    if (parentBlock) {
      const [node, ancestorPath] = parentBlock

      const domNode = ReactEditor.toDOMNode(editor, node)

      dragService?.send({
        type: 'DRAG.OVER',
        toPath: ancestorPath,
        element: domNode as HTMLLIElement,
      })
    }
  }

  if (mode == EditorMode.Embed) {
    return (
      <Box as="span" {...attributes} {...elementProps} {...otherProps}>
        {children}
      </Box>
    )
  }

  if (isCode(parentNode)) {
    return (
      <Box
        as="pre"
        {...attributes}
        {...elementProps}
        {...mouseProps}
        {...otherProps}
      >
        <code>{children}</code>
      </Box>
    )
  }

  if (isBlockquote(parentNode)) {
    return (
      <Box
        as="blockquote"
        {...attributes}
        {...elementProps}
        {...mouseProps}
        {...otherProps}
      >
        <p>{children}</p>
      </Box>
    )
  }

  return (
    <p
      {...attributes}
      {...elementProps}
      {...mouseProps}
      {...otherProps}
      onDragOver={onDragOver}
    >
      {children}
    </p>
  )
}
