import type {EditorPlugin} from '../types'
import type {RenderElementProps} from 'slate-react'
import type {MTTEditor} from '../utils'
import type {Statement as StatementType} from '@mintter/mttast'
import type {NodeEntry} from 'slate'
import {Path, Transforms, Editor} from 'slate'
import {useReadOnly} from 'slate-react'
import {
  useMemo,
  forwardRef,
  // useRef, useCallback, useEffect
} from 'react'
import {useHistory, useLocation, useParams} from 'react-router'
import toast from 'react-hot-toast'
import {isBlockquote, isEmbed, isGroupContent, isHeading, isStatement} from '@mintter/mttast'
import {createDraft} from '@mintter/client'
import {css, styled} from '@mintter/ui/stitches.config'
import {group} from '@mintter/mttast-builder'
import {Icon} from '@mintter/ui/icon'
import {Text} from '@mintter/ui/text'
import {Box} from '@mintter/ui/box'
import {isLastChild, getLastChild, isFirstChild} from '../utils'
import {ContextMenu} from '../context-menu'
import {useSidepanel} from '../../components/sidepanel'
import {MINTTER_LINK_PREFIX} from '../../constants'
import {getEmbedIds} from './embed'
import {StatementTools, Tools} from '../statement-tools'

export const ELEMENT_STATEMENT = 'statement'

export const statementStyle = css({
  // backgroundColor: 'rgba(0,0,0,0.1)',
  marginTop: '$3',
  padding: 0,
  listStyle: 'none',
  display: 'grid',
  wordBreak: 'break-word',
  // gridTemplateColumns: 'minmax($space$8, auto) 1fr',
  gridTemplateColumns: '$space$8 1fr',
  gridTemplateRows: 'min-content auto',
  gap: 0,
  gridTemplateAreas: `"controls content"
  ". children"`,
  [`& > ${Tools}`]: {
    gridArea: 'controls',
  },
  '& > [data-element-type=paragraph]': {
    gridArea: 'content',
  },
  '& > ul, & > ol': {
    gridArea: 'children',
  },
})

const StatementStyled = styled('li', statementStyle)

export const createStatementPlugin = (): EditorPlugin => ({
  name: ELEMENT_STATEMENT,
  renderElement(props) {
    if (isStatement(props.element)) {
      return <Statement {...props} />
    }
  },
  configureEditor(editor) {
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
            Transforms.moveNodes(editor, {at: path, to: lastChild?.[1].concat(0)})
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

function Statement({attributes, children, element}: RenderElementProps) {
  const {docId} = useParams<{docId: string}>()
  const {send} = useSidepanel()
  const location = useLocation()
  const history = useHistory()
  const isDraft = useMemo(() => location.pathname.includes('editor'), [location.pathname])

  async function onCopy() {
    await copyTextToClipboard(`${MINTTER_LINK_PREFIX}${docId}/${(element as StatementType).id}`)
    toast.success('Statement Reference copied successfully', {position: 'top-center'})
  }
  async function onStartDraft() {
    send({type: 'SIDEPANEL_ADD_ITEM', payload: `${MINTTER_LINK_PREFIX}${docId}/${element.id}`})
    try {
      const newDraft = await createDraft()
      if (newDraft) {
        history.push(`/editor/${newDraft.id}`)
      }
    } catch (err) {
      throw Error('new Draft error: ')
    }
  }

  // const onEnter = useCallback((event: MouseEvent<HTMLLIElement>) => {
  //   console.log('onEnter: ', event)
  // }, [])

  // const onLeave = useCallback((event: MouseEvent<HTMLLIElement>) => {
  //   console.log('onLeave: ', event)
  // }, [])

  return (
    <StatementStyled
      {...attributes}
      // onMouseEnter={onEnter} onMouseLeave={onLeave}
    >
      <StatementTools element={element} />
      {!isDraft ? (
        <ContextMenu.Root>
          <ContextMenu.Trigger>{children}</ContextMenu.Trigger>
          <ContextMenu.Content alignOffset={-5}>
            <ContextMenu.Item onSelect={onCopy}>
              <Icon name="Copy" size="1" />
              <Text size="2">Copy Statement Reference</Text>
            </ContextMenu.Item>
            <ContextMenu.Item
              onSelect={() =>
                send({type: 'SIDEPANEL_ADD_ITEM', payload: `${MINTTER_LINK_PREFIX}${docId}/${element.id}`})
              }
            >
              <Icon size="1" name="ArrowBottomRight" />
              <Text size="2">Open in Sidepanel</Text>
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
      {/* <Annotations element={element.children[0]} /> */}
    </StatementStyled>
  )
}

export function removeEmptyStatement(editor: MTTEditor, entry: NodeEntry<StatementType>): boolean | undefined {
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

const StatementMenu = forwardRef((props, ref) => {})
