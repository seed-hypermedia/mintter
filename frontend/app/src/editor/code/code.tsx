import {MINTTER_LINK_PREFIX} from '@app/constants'
import {styled} from '@app/stitches.config'
import {copyTextToClipboard} from '@app/utils/copy-to-clipboard'
import {useRoute} from '@app/utils/use-route'
import {useBookmarksService} from '@components/bookmarks'
import {Box} from '@components/box'
import {Icon} from '@components/icon'
import {Text} from '@components/text'
import type {Code as CodeType} from '@mintter/mttast'
import {createId, FlowContent, isCode, isParagraph, paragraph, statement, text} from '@mintter/mttast'
import toast from 'react-hot-toast'
import type {Highlighter, IThemeRegistration, Lang} from 'shiki'
import {getHighlighter, setCDN} from 'shiki'
import {Editor, Node, Path, Range, Transforms} from 'slate'
import type {RenderElementProps} from 'slate-react'
import {ReactEditor, useSlateStatic} from 'slate-react'
import {BlockTools} from '../block-tools'
import {ContextMenu} from '../context-menu'
import {MARK_EMPHASIS} from '../emphasis'
import {EditorMode} from '../plugin-utils'
import {statementStyle} from '../statement'
import {MARK_STRONG} from '../strong'
import type {EditorPlugin} from '../types'
import {MARK_UNDERLINE} from '../underline'
import {resetFlowContent} from '../utils'

export const ELEMENT_CODE = 'code'
const HIGHLIGHTER = Symbol('shiki highlighter')

const SelectorWrapper = styled('div', {
  boxSizing: 'border-box',
  position: 'absolute',
  right: 0,
  top: 0,
  transform: 'translate(8px, -8px)',
  zIndex: 2,
  opacity: 0,
  transition: 'opacity 0.5s',
})

export const CodeStyled = styled('pre', statementStyle, {
  position: 'relative',
  background: '$background-neutral-soft',
  borderRadius: '$2',
  '&:hover': {
    [`${SelectorWrapper}`]: {
      opacity: 1,
    },
  },
  '& p': {
    color: 'white !important',
  },
})

interface CodePluginProps {
  theme?: IThemeRegistration
}

export const createCodePlugin = (props: CodePluginProps = {}): EditorPlugin => {
  const {theme = 'github-dark'} = props

  setCDN('/shiki/')

  return {
    name: ELEMENT_CODE,
    configureEditor(editor) {
      if (editor.readOnly) return
      /*
       * @todo modify paste so it will add empty lines
       * @body we need to paste code content inside the same paragraph
       */
      const {deleteBackward} = editor
      editor.deleteBackward = (unit) => {
        if (resetFlowContent(editor)) return
        deleteBackward(unit)
      }

      return editor
    },
    renderElement:
      (editor) =>
      ({children, element, attributes}) => {
        if (isCode(element)) {
          return (
            <Code mode={editor.mode} element={element} data-element-type={element.type} attributes={attributes}>
              {children}
            </Code>
          )
        }
      },
    onKeyDown: (editor) => {
      if (editor.readOnly) return
      return (ev) => {
        if (ev.key == 'Enter') {
          const code = Editor.above(editor, {match: isCode})
          if (code) {
            ev.preventDefault()
            if (ev.shiftKey) {
              const [, codePath] = code
              Editor.withoutNormalizing(editor, () => {
                Transforms.insertNodes(editor, statement({id: createId()}, [paragraph([text('')])]), {
                  at: Path.next(codePath),
                })
                Transforms.select(editor, Path.next(codePath))
                Transforms.collapse(editor, {edge: 'start'})
              })
            } else {
              Transforms.insertText(editor, '\n')
            }
          }
        }
      }
    },
    decorate:
      (editor) =>
      ([node, path]) => {
        const ranges: Array<Range> = []

        // if the codeblock has a lang attribute but no highlighter yet, attach one
        if (isCode(node) && !node.data?.[HIGHLIGHTER] && node.lang) {
          getHighlighter({theme, langs: [node.lang]}).then((highlighter) => {
            Transforms.setNodes(editor, {data: {...node.data, [HIGHLIGHTER]: highlighter}}, {at: path})
          })
        }

        // tokenize & decorate the paragraph inside codeblock
        if (isParagraph(node)) {
          const [code] =
            Editor.above(editor, {
              at: path,
              match: isCode,
            }) || []

          if (!code || !code.data?.[HIGHLIGHTER]) return []

          for (const [text, textPath] of Node.texts(node)) {
            const tokens = (code.data?.[HIGHLIGHTER] as Highlighter)
              .codeToThemedTokens(text.value, code.lang)
              .flatMap((l) => l)

            let offset = 0

            for (const token of tokens) {
              const range: Range & Record<string, unknown> = {
                anchor: {path: [...path, ...textPath], offset},
                focus: {path: [...path, ...textPath], offset: offset + token.content.length},
                color: token.color,
              }

              if (token.fontStyle == 1) range[MARK_EMPHASIS] = true
              if (token.fontStyle == 2) range[MARK_STRONG] = true
              if (token.fontStyle == 4) range[MARK_UNDERLINE] = true

              ranges.push(range)
              offset += token.content.length
            }
          }
        }
        return ranges
      },
  }
}

function Code({
  children,
  element,
  attributes,
  mode,
}: RenderElementProps & {
  element: CodeType
  mode: EditorMode
}) {
  const {params} = useRoute<{docId: string; version: string}>(['/p/:docId/:version', '/editor/:docId'])
  const editor = useSlateStatic()
  const path = ReactEditor.findPath(editor, element)
  const bookmarksService = useBookmarksService()

  function addBookmark(docId: string, blockId: FlowContent['id']) {
    bookmarksService.send({
      type: 'ADD.BOOKMARK',
      link: `${MINTTER_LINK_PREFIX}${docId}/${blockId}`,
    })
  }

  function setLanguage(e: React.ChangeEvent<HTMLSelectElement>) {
    const {...newData} = element.data || {}
    delete newData[HIGHLIGHTER]

    Transforms.setNodes(editor, {lang: e.target.value as Lang, data: newData}, {at: path})
  }

  let lang = element.lang || ''

  async function onCopy() {
    if (params) {
      await copyTextToClipboard(`${MINTTER_LINK_PREFIX}${params.docId}/${(element as CodeType).id}`)
      toast.success('Embed Reference copied successfully', {position: 'top-center'})
    } else {
      toast.error('Cannot Copy Embed Reference')
    }
  }

  return (
    <ContextMenu.Root>
      <ContextMenu.Trigger>
        <CodeStyled data-element-type={element.type} {...attributes}>
          {mode == EditorMode.Draft ? (
            <SelectorWrapper
              contentEditable={false}
              css={{
                position: 'absolute',
                right: 0,
                top: 0,
                transform: 'translate(8px, -8px)',
                zIndex: 2,
              }}
            >
              <select id="lang-selection" name="lang-selection" value={lang} onChange={setLanguage}>
                <option value="">Select a Language</option>
                <option value="javascript">JavaScript</option>
                <option value="typescript">TypeScript</option>
                <option value="go">Golang</option>
              </select>
            </SelectorWrapper>
          ) : null}
          <BlockTools element={element} />
          <Box
            as="code"
            css={{
              display: 'block',
              paddingVertical: '$4',
              paddingHorizontal: '$6',
              borderRadius: '$2',
              position: 'relative',
            }}
          >
            {children}
          </Box>
        </CodeStyled>
      </ContextMenu.Trigger>
      <ContextMenu.Content alignOffset={-5}>
        <ContextMenu.Item onSelect={onCopy}>
          <Icon name="Copy" size="1" />
          <Text size="2">Copy Block ID</Text>
        </ContextMenu.Item>
        <ContextMenu.Item onSelect={() => addBookmark(params!.docId, element.id)}>
          <Icon size="1" name="ArrowBottomRight" />
          <Text size="2">Add to Bookmarks</Text>
        </ContextMenu.Item>
      </ContextMenu.Content>
    </ContextMenu.Root>
  )
}
