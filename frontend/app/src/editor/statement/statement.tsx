import {createDraft} from '@mintter/client'
import type {Statement as StatementType} from '@mintter/mttast'
import {isBlockquote, isGroupContent, isHeading, isStatement} from '@mintter/mttast'
import {group} from '@mintter/mttast-builder'
import {Icon} from '@mintter/ui/icon'
import {Text} from '@mintter/ui/text'
import {EditorMode} from 'frontend/app/src/editor/plugin-utils'
import {useRoute} from 'frontend/app/src/utils/use-route'
import toast from 'react-hot-toast'
import type {Node, NodeEntry} from 'slate'
import {Editor, Path, Transforms} from 'slate'
import type {RenderElementProps} from 'slate-react'
import {useSidepanel} from '../../components/sidepanel'
import {MINTTER_LINK_PREFIX} from '../../constants'
import {ContextMenu} from '../context-menu'
import {StatementTools} from '../statement-tools'
import type {EditorPlugin} from '../types'
import {getLastChild, isFirstChild, isLastChild} from '../utils'
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
      if (isStatement(node)) {
        if (removeEmptyStatement(editor, entry)) return
        // check if there's a group below, if so, move inside that group
        const parent = Editor.parent(editor, path)

        if (!isLastChild(parent, path)) {
          const lastChild = getLastChild(parent)
          if (isGroupContent(lastChild?.[0])) {
            // the last child of the statement is a group. we should move the new as the first child
            Transforms.moveNodes(editor, {at: path, to: lastChild?.[1].concat(0) as Path})
            return
          }
        }

        const [parentNode, parentPath] = parent
        if (isStatement(parentNode) || isBlockquote(parentNode)) {
          // if parent is a statement and is the last child (because the previous if is false) then we can move the new statement to the next position of it's parent
          Transforms.moveNodes(editor, {
            at: path,
            to: isFirstChild(path) ? parentPath : Path.next(parentPath),
          })
          return
        }
        if (isHeading(parentNode)) {
          // this statement should be part of a group inside the heading, we need to wrap it!
          Transforms.wrapNodes(editor, group([]), {at: path})
          return
        }

        if (isGroupContent(node.children[0])) {
          Transforms.unwrapNodes(editor, {at: path})
          return
        }
      }
      normalizeNode(entry)
    }

    return editor
  },
})

function Statement({attributes, children, element, mode}: RenderElementProps & {mode: EditorMode}) {
  const {send} = useSidepanel()
  const {params} = useRoute<{docId: string}>(['/p/:docId', '/editor/:docId'])

  async function onCopy() {
    if (params) {
      await copyTextToClipboard(`${MINTTER_LINK_PREFIX}${params.docId}/${(element as StatementType).id}`)
      toast.success('Statement Reference copied successfully', {position: 'top-center'})
    } else {
      toast.error('Cannot Copy Statement Reference')
    }
  }
  async function onStartDraft() {
    send({
      type: 'SIDEPANEL_ADD_ITEM',
      payload: `${MINTTER_LINK_PREFIX}${params!.docId}/${(element as StatementType).id}`,
    })
    try {
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
      <StatementTools element={element} />
      {mode != EditorMode.Draft ? (
        <ContextMenu.Root modal={false}>
          <ContextMenu.Trigger>{children}</ContextMenu.Trigger>
          <ContextMenu.Content alignOffset={-5}>
            <ContextMenu.Item onSelect={onCopy}>
              <Icon name="Copy" size="1" />
              <Text size="2">Copy Statement Reference</Text>
            </ContextMenu.Item>
            <ContextMenu.Item
              onSelect={() =>
                send({
                  type: 'SIDEPANEL_ADD_ITEM',
                  payload: `${MINTTER_LINK_PREFIX}${params!.docId}/${(element as StatementType).id}`,
                })
              }
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

export function removeEmptyStatement(editor: Editor, entry: NodeEntry<Node>): boolean | undefined {
  const [node, path] = entry
  if (isStatement(node)) {
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
