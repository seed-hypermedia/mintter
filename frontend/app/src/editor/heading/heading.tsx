import {createDraft} from '@app/client'
import {MINTTER_LINK_PREFIX} from '@app/constants'
import {ContextMenu} from '@app/editor/context-menu'
import {EditorMode} from '@app/editor/plugin-utils'
import {useRoute} from '@app/utils/use-route'
import {useBookmarksService} from '@components/bookmarks'
import {Icon} from '@components/icon'
import {Text} from '@components/text'
import {
  createId,
  FlowContent,
  Heading as HeadingType,
  isGroupContent,
  isHeading,
  isStaticParagraph,
  statement,
} from '@mintter/mttast'
import toast from 'react-hot-toast'
import {Editor, Element, NodeEntry, Transforms} from 'slate'
import {RenderElementProps} from 'slate-react'
import {useLocation} from 'wouter'
import {BlockTools} from '../block-tools'
import type {EditorPlugin} from '../types'
import {isFirstChild, resetFlowContent} from '../utils'
import {HeadingUI} from './heading-ui'

export const ELEMENT_HEADING = 'heading'

export const createHeadingPlugin = (): EditorPlugin => ({
  name: ELEMENT_HEADING,
  renderElement:
    (editor) =>
    ({attributes, children, element}) => {
      if (isHeading(element)) {
        return (
          <Heading mode={editor.mode} element={element} data-element-type={element.type} attributes={attributes}>
            {children}
          </Heading>
        )
      }
    },
  configureEditor: (editor) => {
    if (editor.readOnly) return
    const {normalizeNode, deleteBackward, insertBreak} = editor

    editor.deleteBackward = (unit) => {
      if (resetFlowContent(editor)) return
      deleteBackward(unit)
    }

    editor.normalizeNode = (entry) => {
      const [node, path] = entry
      if (Element.isElement(node) && isHeading(node)) {
        if (removeEmptyHeading(editor, entry as NodeEntry<HeadingType>)) return

        if (isFirstChild(path.concat(0)) && !isStaticParagraph(node.children[0])) {
          // transform to static paragraph if there's only one child and is not static paragraph
          Transforms.setNodes(editor, {type: 'staticParagraph'}, {at: path.concat(0)})
          return
        } else if (node.children.length > 2) {
          let secondChild = node.children[1]
          console.log('==== segundo heading child: ', node.children[1])
          if (isStaticParagraph(secondChild)) {
            Editor.withoutNormalizing(editor, () => {
              let at = path.concat(1)
              Transforms.moveNodes(editor, {at, to: path.concat(2, 0)})
              return
            })
          }
        } else if (node.children.length == 2) {
          if (!isGroupContent(node.children[1])) {
            // move second static paragraph outside if the second node is not a group
            let pGroupEntry = Editor.above(editor, {at: path.concat(1), match: isGroupContent})

            Editor.withoutNormalizing(editor, () => {
              let at = path.concat(1)
              Transforms.setNodes(editor, {type: 'paragraph'}, {at})
              Transforms.wrapNodes(editor, statement({id: createId()}), {at})
              Transforms.wrapNodes(editor, {type: pGroupEntry ? pGroupEntry[0].type : 'group', children: []}, {at})
            })
            return
          }
        }
      }
      normalizeNode(entry)
    }
    return editor
  },
})

function Heading({attributes, children, element, mode}: RenderElementProps & {mode: EditorMode}) {
  const bookmarksService = useBookmarksService()

  const {params} = useRoute<{docId: string; version: string; blockId?: string}>([
    '/p/:docId/:version/:blockId?',
    '/editor/:docId',
  ])
  const [, setLocation] = useLocation()

  async function onCopy() {
    if (params) {
      await copyTextToClipboard(
        `${MINTTER_LINK_PREFIX}${params.docId}/${params.version}/${(element as HeadingType).id}`,
      )
      toast.success('Statement Reference copied successfully', {position: 'top-center'})
    } else {
      toast.error('Cannot Copy Block ID')
    }
  }

  function addBookmark(docId: string, blockId: FlowContent['id']) {
    bookmarksService.send({
      type: 'ADD.BOOKMARK',
      link: `${MINTTER_LINK_PREFIX}${docId}/${blockId}`,
    })
  }

  async function onStartDraft() {
    try {
      addBookmark(params!.docId, (element as HeadingType).id)
      const newDraft = await createDraft()
      if (newDraft) {
        setLocation(`/editor/${newDraft.id}`)
      }
    } catch (err) {
      throw Error('new Draft error: ')
    }
  }

  if (mode == EditorMode.Embed || mode == EditorMode.Mention) {
    return (
      <span className="DEMODEMO" {...attributes}>
        {children}
      </span>
    )
  }

  return (
    <HeadingUI {...attributes} data-element-type={element.type}>
      <BlockTools element={element} />
      {mode != EditorMode.Draft ? (
        <ContextMenu.Root modal={false}>
          <ContextMenu.Trigger>{children}</ContextMenu.Trigger>
          <ContextMenu.Content alignOffset={-5}>
            <ContextMenu.Item onSelect={onCopy}>
              <Icon name="Copy" size="1" />
              <Text size="2">Copy Block ID</Text>
            </ContextMenu.Item>
            <ContextMenu.Item
              onSelect={() => {
                addBookmark(params!.docId, (element as HeadingType).id)
                toast.success('Bookmark added!')
              }}
            >
              <Icon size="1" name="ArrowBottomRight" />
              <Text size="2">Add to Bookmarks</Text>
            </ContextMenu.Item>
            <ContextMenu.Item onSelect={onStartDraft}>
              <Icon size="1" name="AddCircle" />
              <Text size="2">Start a Draft</Text>
            </ContextMenu.Item>
          </ContextMenu.Content>
        </ContextMenu.Root>
      ) : (
        children
      )}
    </HeadingUI>
  )
}

function removeEmptyHeading(editor: Editor, entry: NodeEntry<Heading>): boolean | undefined {
  const [node, path] = entry
  if (node.children.length == 1) {
    let child = Editor.node(editor, path.concat(0))
    if (!('type' in child[0])) {
      Transforms.removeNodes(editor, {at: path})
      return true
    }
  }
}

function copyTextToClipboard(text: string) {
  return new Promise((resolve, reject) => {
    if (!navigator.clipboard) {
      return fallbackCopyTextToClipboard(text)
    }
    return navigator.clipboard.writeText(text).then(
      () => {
        resolve(text)
      },
      (err) => {
        console.error('Async: Could not copy text: ', err)
        reject(err)
      },
    )
  })
}

function fallbackCopyTextToClipboard(text: string) {
  return new Promise((resolve, reject) => {
    const textArea = document.createElement('textarea')
    textArea.value = text

    // Avoid scrolling to bottom
    textArea.style.top = '0'
    textArea.style.left = '0'
    textArea.style.position = 'fixed'
    textArea.style.opacity = '0'

    document.body.appendChild(textArea)
    textArea.focus()
    textArea.select()

    try {
      document.execCommand('copy')
    } catch (err) {
      console.error('Fallback: Oops, unable to copy', err)
      reject(err)
    }

    document.body.removeChild(textArea)
    resolve(true)
  })
}
