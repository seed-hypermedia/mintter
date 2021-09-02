import {Path, Transforms} from 'slate'
import type {EditorPlugin} from '../types'
import type {Embed, Paragraph, StaticParagraph} from '@mintter/mttast'
import {Editor} from 'slate'
import {isBlockquote, isEmbed, isGroupContent, isHeading, isStatement} from '@mintter/mttast'
import type {Statement as StatementType} from '@mintter/mttast'
import {isLastChild, getLastChild, isFirstChild} from '../utils'
import type {MTTEditor} from '../utils'
import {styled} from '@mintter/ui/stitches.config'
import {group} from '@mintter/mttast-builder'
import {Icon} from '@mintter/ui/icon'
import {Text} from '@mintter/ui/text'
import {Marker} from '../marker'
import type {NodeEntry} from 'slate'
import {ContextMenu} from '../context-menu'
import {useHistory, useLocation, useParams} from 'react-router'
import toast from 'react-hot-toast'
import {useSidepanel} from '../../components/sidepanel'
import {createDraft} from 'frontend/client/src/drafts'
import {MINTTER_LINK_PREFIX} from '../../constants'
import {useMemo} from 'react'
import {Box} from '@mintter/ui/box'
import {useEffect} from 'react'
import {Node} from 'slate'
import {ReactEditor, useSlateStatic} from 'slate-react'
import {getEmbedIds, useEmbed} from './embed'
import {useQuery} from 'react-query'
import {useAccount, usePublication} from '@mintter/client/hooks'

export const ELEMENT_STATEMENT = 'statement'

export const Tools = styled('div', {
  height: '$space$8',
  overflow: 'hidden',
  alignSelf: 'start',
  display: 'flex',
  alignItems: 'center',
  userSelect: 'none',
  WebkitUserSelect: 'none',
})

const StatementStyled = styled('li', {
  // backgroundColor: 'rgba(0,0,0,0.1)',
  marginTop: '$3',
  padding: 0,
  listStyle: 'none',
  display: 'grid',
  wordBreak: 'break-word',
  gridTemplateColumns: 'minmax($space$8, auto) 1fr 300px',
  gridTemplateRows: 'min-content auto',
  gap: 0,
  gridTemplateAreas: `"controls content annotations"
  ". children annotations"`,
  marginRight: -300,
  [`& > ${Tools}`]: {
    gridArea: 'controls',
  },
  "& > [data-element-type='paragraph']": {
    gridArea: 'content',
  },
  '& > ul, & > ol': {
    gridArea: 'children',
  },
})

export const Dragger = styled('div', {
  // backgroundColor: 'red',
  width: '$space$8',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  height: 32,
  borderRadius: '$2',
  opacity: 0,
  transition: 'all ease-in-out 0.1s',
  '&:hover': {
    opacity: 1,
    cursor: 'grab',
  },
})

export const createStatementPlugin = (): EditorPlugin => ({
  name: ELEMENT_STATEMENT,
  renderElement({attributes, children, element}) {
    // TODO: create a hook to get all the embeds from its content to rendered as annotations. this should be used to all FlowContent nodes
    // const editor = useSlateStatic()
    // const currentPath = ReactEditor.findPath(editor, element)
    // const [parent, parentPath] = Editor.parent(editor, currentPath)
    // useEffect(() => {
    //   console.log('parent new childs!', element, parent)
    // }, [parent.children.length])
    if (isStatement(element)) {
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

      return (
        <StatementStyled {...attributes}>
          <Tools contentEditable={false}>
            <Dragger data-dragger>
              <Icon name="Grid6" size="2" color="muted" />
            </Dragger>
            <Marker element={element} />
          </Tools>
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
          <Annotations element={element.children[0]} />
        </StatementStyled>
      )
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

function Annotations({element}: {element: Paragraph | StaticParagraph}) {
  const editor = useSlateStatic()
  const path = ReactEditor.findPath(editor, element)
  let annotations = useMemo(() => {
    return Array.from(
      Editor.nodes(editor, {
        at: path,
        match: isEmbed,
      }),
    )
  }, [element.children.length])

  return (
    <aside>
      <Box
        as="ul"
        contentEditable={false}
        css={{height: 40, gridArea: 'annotations', userSelect: 'none', margin: 0, padding: 0}}
      >
        {annotations.map(([child]) => (
          <AnnotationItem item={child} />
        ))}
      </Box>
    </aside>
  )
}

function AnnotationItem({item}: {item: Embed}) {
  const [publicationId] = getEmbedIds(item.url)
  const {data} = usePublication(publicationId)
  console.log('🚀 ~ file: statement.tsx ~ line 229 ~ AnnotationItem ~ data', data)
  const {data: author} = useAccount(undefined, {
    enabled: !!data.document,
  })
  return data && author ? (
    <Box
      as="li"
      css={{
        display: 'block',

        borderRadius: '$2',
        padding: '$3',
        '&:hover': {
          backgroundColor: '$background-muted',
        },
      }}
    >
      <Text
        size="3"
        fontWeight="bold"
        css={{width: 200, whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden'}}
      >
        {data.document.title}
      </Text>
      <Box css={{display: 'flex', gap: '$2', alignItems: 'center', marginTop: '$2'}}>
        <Box css={{width: 24, height: 24, backgroundColor: '$background-neutral', borderRadius: '$round'}} />
        <Text size="2" color="muted">
          {author?.profile?.alias}
        </Text>
      </Box>
    </Box>
  ) : (
    <span>...</span>
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
