import React, {useReducer, useCallback, useState} from 'react'
import {Editor as SlateEditor, Transforms, Node, Range} from 'slate'
import {Slate, ReactEditor} from 'slate-react'
import {
  Icons,
  nodeTypes,
  Editor,
  useEditor,
  createPlugins,
  initialBlocksValue,
  EditorComponent,
  useEditorValue,
  toSlateTree,
  options,
  ELEMENT_BLOCK,
  ELEMENT_BLOCK_LIST,
  ELEMENT_TRANSCLUSION,
  ELEMENT_PARAGRAPH,
  toBlock,
  toDocument,
  SlateBlock,
  TransclusionHelperProvider,
} from '@mintter/editor'
import {Document} from '@mintter/proto/v2/documents_pb'
import Seo from 'components/seo'
import EditorHeader from 'components/editor-header'
import {DebugValue} from 'components/debug'
import {css} from 'emotion'
import {useParams, useHistory} from 'react-router-dom'
import {useDocument, useDrafts, useMintter} from 'shared/mintterContext'
import {useProfile} from 'shared/profileContext'
import Layout from 'components/layout'
import {FullPageSpinner} from 'components/fullPageSpinner'
import {ErrorMessage} from 'components/errorMessage'
import {AuthorLabel} from 'components/author-label'
import Container from 'components/container'
import {useTransclusion} from 'shared/useTransclusion'
import {
  UpdateDraftRequest,
  BlockRefList,
  Block,
} from '@mintter/proto/v2/documents_pb'
import {v4 as uuid} from 'uuid'
import {Page} from 'components/page'
import {MainColumn} from 'components/main-column'

function useDraftsSelection() {
  const [drafts, setOptions] = React.useState([])
  const {status, data} = useDrafts()

  React.useEffect(() => {
    if (status === 'success') {
      setOptions([...data, {version: undefined, title: 'New Draft'}])
    }
  }, [status, data])

  return {
    drafts,
  }
}

export default function Publication(): JSX.Element {
  const {push} = useHistory()
  const {version} = useParams()
  const editorOptions = {
    ...options,
    transclusion: {
      ...options.transclusion,
      push,
    },
  }
  const plugins = createPlugins(editorOptions)

  const editor: ReactEditor = useEditor(plugins, editorOptions) as ReactEditor

  const {createDraft} = useMintter()

  const {status, error, data, isFetching, failureCount} = useDocument(version)
  const {state, setValue} = useEditorValue({
    document: data,
  })
  const {title, blocks, subtitle, author: pubAuthor} = state
  const {data: author} = useProfile(pubAuthor)

  const {drafts} = useDraftsSelection()
  const {createTransclusion} = useTransclusion({editor})

  async function handleTransclusion({destination, block}) {
    const draftUrl = await createTransclusion({
      source: version,
      destination: destination.version,
      block: block,
    })

    push(`/editor/${draftUrl}`)
  }

  let content

  if (status === 'loading') {
    content = <p>Loading..</p>
  } else if (status === 'error') {
    content = (
      <div className="mx-8">
        <ErrorMessage error={error} />
      </div>
    )
  } else {
    content = (
      <>
        <div
          className={`pb-2 relative ${css`
            &:after {
              content: '';
              position: absolute;
              bottom: 1px;
              left: 0;
              width: 50%;
              max-width: 360px;
              height: 1px;
              z-index: 20;
              background-color: var(--color-muted-hover);
            }
          `}`}
        >
          <h1
            className={`text-4xl text-heading font-bold italic ${css`
              word-wrap: break-word;
              white-space: pre-wrap;
              min-height: 56px;
            `}`}
          >
            {title}
          </h1>
          <p
            className={`leading-relaxed text-lg font-light text-heading-muted italic mt-4 ${css`
              word-wrap: break-word;
              white-space: pre-wrap;
              min-height: 28px;
            `}`}
          >
            {subtitle}
          </p>
          <p className=" text-sm mt-4 text-heading">
            <span>by </span>

            <AuthorLabel author={author} />
          </p>
        </div>
        <EditorComponent
          readOnly
          editor={editor}
          plugins={plugins}
          value={blocks}
          onChange={() => {}}
        />
      </>
    )
  }

  return (
    <>
      <Seo title="Publication" />
      <Page>
        <MainColumn>
          <TransclusionHelperProvider
            options={drafts}
            handleTransclusion={handleTransclusion}
          >
            {content}
          </TransclusionHelperProvider>
        </MainColumn>
      </Page>
    </>
  )
}
