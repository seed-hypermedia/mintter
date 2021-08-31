import type {Document} from '@mintter/client'
import type {Statement} from '@mintter/mttast'
import {useMemo} from 'react'
import {Slate, Editable} from 'slate-react'
import {createLinkPlugin} from './elements/link'
// import {createEmbedPlugin} from './elements/embed'
import {createParagraphPlugin} from './elements/paragraph'
import {createStaticParagraphPlugin} from './elements/static-paragraph'
import {createEmphasisPlugin} from './leafs/emphasis'
import {createStrikethroughPlugin} from './leafs/strikethrough'
import {createStrongPlugin} from './leafs/strong'
import {createSubscriptPlugin} from './leafs/subscript'
import {createSuperscriptPlugin} from './leafs/superscript'
import {createUnderlinePlugin} from './leafs/underline'
import {buildDecorateHook, buildEditorHook, buildRenderElementHook, buildRenderLeafHook} from './plugin-utils'
import type {EditorDocument} from './use-editor-draft'

const inlinePlugins = [
  createStrongPlugin(),
  createEmphasisPlugin(),
  createUnderlinePlugin(),
  createStrikethroughPlugin(),
  createSuperscriptPlugin(),
  createSubscriptPlugin(),
  createLinkPlugin(),
  // createEmbedPlugin(),
  createStaticParagraphPlugin(),
  createParagraphPlugin(),
]

type InlineEditorProps = {
  document: EditorDocument
  statement: Statement
}

export function InlineEditor({statement, document}: InlineEditorProps) {
  let mode = 'read-only'
  const editor = useMemo(() => buildEditorHook(inlinePlugins, mode), [])
  const renderElement = useMemo(() => buildRenderElementHook(inlinePlugins, mode), [])
  const renderLeaf = useMemo(() => buildRenderLeafHook(inlinePlugins, mode), [])
  const decorate = useMemo(() => buildDecorateHook(inlinePlugins, mode), [])
  return (
    <Slate editor={editor} value={statement.children[0].children} onChange={() => {}}>
      <Editable
        as="span"
        style={{background: 'red'}}
        readOnly={true}
        renderElement={renderElement}
        renderLeaf={renderLeaf}
        decorate={decorate}
      />
    </Slate>
  )
}
