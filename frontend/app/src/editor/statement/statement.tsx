import {createDraft} from '@mintter/client'
import type {FlowContent, Statement as StatementType} from '@mintter/mttast'
import {isBlockquote, isGroupContent, isHeading, isStatement} from '@mintter/mttast'
import {group} from '@mintter/mttast-builder'
import {Icon} from '@mintter/ui/icon'
import {Text} from '@mintter/ui/text'
import {useActor} from '@xstate/react'
import toast from 'react-hot-toast'
import type {Node, NodeEntry} from 'slate'
import {Editor, Path, Transforms} from 'slate'
import type {RenderElementProps} from 'slate-react'
import {useLocation} from 'wouter'
import {useBookmarksService} from '../../components/bookmarks'
import {useSidepanel} from '../../components/sidepanel'
import {MINTTER_LINK_PREFIX} from '../../constants'
import {useRoute} from '../../utils/use-route'
import {BlockTools} from '../block-tools'
import {ContextMenu} from '../context-menu'
import {EditorMode} from '../plugin-utils'
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
  onKeyDown: (editor) => (event) => {
    if (editor.selection && event.key == 'Enter' && event.shiftKey) {
      event.preventDefault()
      Transforms.insertText(editor, '\n')
      return
    }
  },
})

function Statement({attributes, children, element, mode}: RenderElementProps & {mode: EditorMode}) {
  const bookmarksService = useBookmarksService()
  const [, bookmarkSend] = useActor(bookmarksService)
  const sidepanelService = useSidepanel()
  const [, sidepanelSend] = useActor(sidepanelService)
  const {params} = useRoute<{docId: string; blockId?: string}>(['/p/:docId/:blockId?', '/editor/:docId'])
  const [, setLocation] = useLocation()

  async function onCopy() {
    if (params) {
      await copyTextToClipboard(`${MINTTER_LINK_PREFIX}${params.docId}/${(element as StatementType).id}`)
      toast.success('Statement Reference copied successfully', {position: 'top-center'})
    } else {
      toast.error('Cannot Copy Block Reference')
    }
  }

  function addBookmark(docId: string, blockId: FlowContent['id']) {
    bookmarkSend({
      type: 'ADD_BOOKMARK',
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
              <Text size="2">Copy Block Reference</Text>
            </ContextMenu.Item>
            <ContextMenu.Item
              onSelect={() => {
                addBookmark(params!.docId, (element as StatementType).id)
                sidepanelSend('SIDEPANEL_OPEN')
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
      {/* <Box
        contentEditable={false}
        className="citations"
        css={{
          gridArea: 'citations',
          marginHorizontal: '-$3',
          marginVertical: '$4',
          opacity: 0,
        }}
      >
        <Button
          variant="ghost"
          size="1"
          onClick={(e) => {
            e.preventDefault()
          }}
        >
          Show 3 Mentions
        </Button>
      </Box> */}
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
