import {Path, Range} from 'slate'
import type {Lang} from 'shiki'
import type {RenderElementProps} from 'slate-react'
import {useReadOnly} from 'slate-react'
import type {Code as CodeType} from '@mintter/mttast'
import type {Highlighter, IThemeRegistration} from 'shiki'
import type {EditorPlugin} from '../types'
import {ReactEditor, useSlateStatic} from 'slate-react'
import {resetFlowContent} from '../utils'
import {setCDN, getHighlighter} from 'shiki'
import {Box} from '@mintter/ui/box'
import {styled} from '@mintter/ui/stitches.config'
import {isCode, isParagraph} from '@mintter/mttast'
import {Editor, Node, Transforms} from 'slate'
import {MARK_EMPHASIS} from '../leafs/emphasis'
import {MARK_STRONG} from '../leafs/strong'
import {MARK_UNDERLINE} from '../leafs/underline'
import {StatementTools} from '../statement-tools'
import {copyTextToClipboard, statementStyle} from './statement'
import {createId, paragraph, statement, text} from '@mintter/mttast-builder'
import {ContextMenu} from '../context-menu'
import {Icon} from '@mintter/ui/icon'
import {Text} from '@mintter/ui/text'
import {MINTTER_LINK_PREFIX} from '../../constants'
import {useParams} from 'react-router'
import toast from 'react-hot-toast'
import {useSidepanel} from '../../components/sidepanel'

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
  code: {
    overflowX: 'scroll',
  },
  '&:hover': {
    [`${SelectorWrapper}`]: {
      opacity: 1,
    },
  },
})

interface CodePluginProps {
  theme?: IThemeRegistration
}

export const createCodePlugin = async (props: CodePluginProps = {}): Promise<EditorPlugin> => {
  const {theme = 'github-dark'} = props

  setCDN('/shiki/')

  let editor: Editor

  return {
    name: ELEMENT_CODE,
    configureEditor(e) {
      editor = e

      /*
       * @todo modify paste so it will add empty lines
       * @body we need to paste code content inside the same paragraph
       */
      const {deleteBackward} = e
      e.deleteBackward = (unit) => {
        if (resetFlowContent(editor)) return
        deleteBackward(unit)
      }

      return e
    },
    renderElement({children, element, attributes}) {
      if (isCode(element)) {
        return (
          <Code element={element} attributes={attributes}>
            {children}
          </Code>
        )
      }
    },
    onKeyDown(ev) {
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
    },
    decorate([node, path]) {
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
}: RenderElementProps & {
  element: CodeType
}) {
  const {docId} = useParams<{docId: string}>()
  const editor = useSlateStatic()
  const path = ReactEditor.findPath(editor, element)
  const isReadOnly = useReadOnly()
  const {send} = useSidepanel()

  function setLanguage(e: React.ChangeEvent<HTMLSelectElement>) {
    const {...newData} = element.data || {}
    delete newData[HIGHLIGHTER]

    Transforms.setNodes(editor, {lang: e.target.value as Lang, data: newData}, {at: path})
  }

  let lang = element.lang || ''

  async function onCopy() {
    await copyTextToClipboard(`${MINTTER_LINK_PREFIX}${docId}/${(element as CodeType).id}`)
    toast.success('Statement Reference copied successfully', {position: 'top-center'})
  }

  return (
    <ContextMenu.Root>
      <ContextMenu.Trigger>
        <CodeStyled data-element-type={element.type} {...attributes}>
          {!isReadOnly ? (
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
          <StatementTools element={element} />
          <Box
            as="code"
            css={{
              backgroundColor: '$background-muted',
              padding: '$8',
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
          <Text size="2">Copy Statement Reference</Text>
        </ContextMenu.Item>
        <ContextMenu.Item
          onSelect={() => send({type: 'SIDEPANEL_ADD_ITEM', payload: `${MINTTER_LINK_PREFIX}${docId}/${element.id}`})}
        >
          <Icon size="1" name="ArrowBottomRight" />
          <Text size="2">Open in Sidepanel</Text>
        </ContextMenu.Item>
      </ContextMenu.Content>
    </ContextMenu.Root>
  )
}
