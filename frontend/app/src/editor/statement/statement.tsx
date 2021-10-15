import {isBlockquote, isGroupContent, isHeading, isStatement} from '@mintter/mttast'
import {group} from '@mintter/mttast-builder'
import type {Node, NodeEntry} from 'slate'
import {Editor, Path, Transforms} from 'slate'
import type {RenderElementProps} from 'slate-react'
import {ContextMenu, copy, custom, cut, paste, separator} from '../menu'
import {EditorMode} from '../plugin-utils'
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
  onKeyDown: (editor) => (event) => {
    if (editor.selection && event.key == 'Enter' && event.shiftKey) {
      event.preventDefault()
      Transforms.insertText(editor, '\n')
      return
    }
  },
  menu: () => (key) => {
    if (key === 'statement') {
      return [
        cut(),
        copy(),
        paste(),
        separator(),
        custom({label: 'Add to bookmarks', icon: 'ArrowBottomRight'}),
        custom({
          label: 'Start a draft',
          accelerator: 'CmdOrControl+D',
          icon: 'AddCircle',
          onClick: async () => {
            console.log('start a draft')

            // try {
            //   const newDraft = await createDraft()
            //   if (newDraft) {
            //     location.pathname = `/editor/${newDraft.id}`
            //   }
            // } catch (err) {
            //   throw Error('new Draft error: ')
            // }
          },
        }),
      ]
    }
  },
})

function Statement({attributes, children, element, mode}: RenderElementProps & {mode: EditorMode}) {
  if (mode == EditorMode.Embed || mode == EditorMode.Mention) {
    return <span {...attributes}>{children}</span>
  }

  return (
    <StatementUI {...attributes}>
      <StatementTools element={element} />
      <ContextMenu name="statement">{children}</ContextMenu>
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
