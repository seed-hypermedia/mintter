import {createDraft} from '@app/client'
import {MINTTER_LINK_PREFIX} from '@app/constants'
import {useRoute} from '@app/utils/use-route'
import {useBookmarksService} from '@components/bookmarks'
import {Icon} from '@components/icon'
import {useSidepanel} from '@components/sidepanel'
import {Text} from '@components/text'
import type {FlowContent, Statement as StatementType} from '@mintter/mttast'
import {isFlowContent, isGroupContent, isParagraph, isStatement} from '@mintter/mttast'
import toast from 'react-hot-toast'
import {Editor, Element, Node, NodeEntry, Path, Transforms} from 'slate'
import type {RenderElementProps} from 'slate-react'
import {useLocation} from 'wouter'
import {BlockTools} from '../block-tools'
import {ContextMenu} from '../context-menu'
import {EditorMode} from '../plugin-utils'
import type {EditorPlugin} from '../types'
import {isFirstChild} from '../utils'
import {StatementUI} from './statement-ui'

export const ELEMENT_STATEMENT = 'statement'

export const createStatementPlugin = (): EditorPlugin => ({
  name: ELEMENT_STATEMENT,
  renderElement:
    (editor) =>
    ({element, children, attributes}) => {
      if (isStatement(element)) {
        return (
          <Statement mode={editor.mode} element={element} data-element-type={element.type} attributes={attributes}>
            {children}
          </Statement>
        )
      }
    },
  configureEditor(editor) {
    if (editor.readOnly) return
    const {normalizeNode} = editor

    editor.normalizeNode = (entry) => {
      const [node, path] = entry
      if (Element.isElement(node) && isStatement(node)) {
        if (removeEmptyStatement(editor, entry as NodeEntry<StatementType>)) return

        if (addParagraphToNestedGroup(editor, entry as NodeEntry<StatementType>)) return
        for (const [child, childPath] of Node.children(editor, path, {reverse: true})) {
          if (isFirstChild(childPath)) {
            if (isFlowContent(child)) {
              Transforms.unwrapNodes(editor, {at: childPath})
              return
            }

            if (!isParagraph(child)) {
              Transforms.setNodes(editor, {type: 'paragraph'}, {at: childPath})
              return
            }
          }

          if (isFlowContent(child)) {
            Transforms.moveNodes(editor, {at: childPath, to: Path.next(path)})
            return
          }

          if (childPath[childPath.length - 1] == 1) {
            // statement second child
            if (isParagraph(child)) {
              let index = childPath[childPath.length - 1]
              let nextChild = node.children[index + 1]
              // next child is grupo!
              if (isGroupContent(nextChild)) {
                Transforms.moveNodes(editor, {at: childPath, to: Path.next(childPath).concat(0)})
                return
              } else if (!isGroupContent(child)) {
                Transforms.moveNodes(editor, {at: childPath, to: Path.next(path)})
                return
              }
            }
          }

          if (childPath[childPath.length - 1] > 1) {
            console.log('statement greater than 2 child', child)
            Transforms.moveNodes(editor, {at: childPath, to: Path.next(path)})
            return
          }

          if (isGroupContent(child)) {
            let prev = Editor.previous(editor, {at: childPath, match: isFlowContent})
            if (prev) {
              let [, pPath] = prev
              Transforms.moveNodes(editor, {at: childPath, to: pPath.concat(1)})
              return
            }
          }
        }
      }
      normalizeNode(entry)
    }

    return editor
  },
  onKeyDown: (editor) => (event) => {
    if (editor.selection && event.key == 'Enter') {
      if (event.shiftKey) {
        event.preventDefault()
        Transforms.insertText(editor, '\n')
        return
      }
    }
  },
})

function addParagraphToNestedGroup(editor: Editor, entry: NodeEntry<StatementType>): boolean | undefined {
  let [node, path] = entry
  //@ts-ignore
  if (node.children.length > 2 && isParagraph(node.children[1]) && isGroupContent(node.children[2])) {
    Transforms.moveNodes(editor, {at: path.concat(1), to: path.concat(2, 0)})
    return true
  }
}

function Statement({attributes, children, element, mode}: RenderElementProps & {mode: EditorMode}) {
  const bookmarksService = useBookmarksService()
  const sidepanelService = useSidepanel()
  const {params} = useRoute<{docId: string; version: string; blockId?: string}>([
    '/p/:docId/:version/:blockId?',
    '/editor/:docId',
  ])
  const [, setLocation] = useLocation()

  async function onCopy() {
    if (params) {
      await copyTextToClipboard(
        `${MINTTER_LINK_PREFIX}${params.docId}/${params.version}/${(element as StatementType).id}`,
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
      addBookmark(params!.docId, (element as StatementType).id)
      const newDraft = await createDraft()
      if (newDraft) {
        setLocation(`/editor/${newDraft.id}`)
      }
    } catch (err) {
      throw Error('new Draft error: ')
    }
  }

  if (mode == EditorMode.Embed || mode == EditorMode.Mention) {
    return <span {...attributes}>{children}</span>
  }

  return (
    <StatementUI {...attributes}>
      <BlockTools element={element as FlowContent} />
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
                addBookmark(params!.docId, (element as StatementType).id)
                sidepanelService.send('SIDEPANEL_OPEN')
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
    </StatementUI>
  )
}

export function removeEmptyStatement(editor: Editor, entry: NodeEntry<StatementType>): boolean | undefined {
  const [node, path] = entry
  if (node.children.length == 1) {
    const children = Editor.node(editor, path.concat(0))
    if (!('type' in children[0])) {
      Transforms.removeNodes(editor, {
        at: path,
      })
      return true
    }
  }
}

export function copyTextToClipboard(text: string) {
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
