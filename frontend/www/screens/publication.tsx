import React, {useReducer, useCallback, useState} from 'react'
import {Editor as SlateEditor, Transforms, Node, Range} from 'slate'
import {Slate, ReactEditor} from 'slate-react'

import {
  Icons,
  nodeTypes,
  Editor,
  useEditor,
  plugins as editorPlugins,
  initialBlocksValue,
  // SectionToolbar,
  EditorComponent,
  renderReadOnlyBlockElement,
  renderElementReadOnlyBlockList,
  useEditorValue,
  toSlateTree,
} from '@mintter/editor'
import Seo from 'components/seo'
import EditorHeader from 'components/editor-header'
import {DebugValue} from 'components/debug'
import {css} from 'emotion'
import {useParams} from 'react-router-dom'
import {Section} from '@mintter/proto/documents_pb'
import {markdownToSlate} from 'shared/markdownToSlate'
import {useMintter} from 'shared/mintterContext'
import {useProfile} from 'shared/profileContext'
import Layout from 'components/layout'
import {FullPageSpinner} from 'components/fullPageSpinner'
import {ErrorMessage} from 'components/errorMessage'
import {AuthorLabel} from 'components/author-label'
import Container from 'components/container'

export default function Publication(): JSX.Element {
  const plugins = [...editorPlugins]
  const editor: ReactEditor = useEditor(plugins) as ReactEditor
  const {state, setValue} = useEditorValue()
  const {getDocument, getSections, getAuthor} = useMintter()

  const {version} = useParams()

  const {title, blocks, subtitle, author: pubAuthor} = state

  const author = getAuthor(pubAuthor)

  const {status, error, data, isFetching, failureCount} = getDocument(version)

  React.useEffect(() => {
    if (data) {
      const {document, blocksMap} = data.toObject()

      const {title, subtitle, blockRefList} = document
      const blocks = toSlateTree({blockRefList, blocksMap})

      setValue({
        title,
        subtitle,
        blocks: [blocks] || initialBlocksValue,
      })
    }
  }, [data])

  let content

  if (status === 'loading') {
    content = <p>Loading...</p>
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
          renderElements={[
            renderReadOnlyBlockElement(),
            renderElementReadOnlyBlockList(),
          ]}
        />
      </>
    )
  }

  return (
    <>
      <Seo title="Publication" />
      <div
        className={`${css`
          display: grid;

          grid-template: auto 1fr / minmax(250px, 20%) 1fr minmax(250px, 20%);
          grid-gap: 1rem;
        `}`}
      >
        <div
          className={`p-4 ${css`
            grid-column: 2/3;
          `}`}
        >
          <div
            className={`my-0 mx-auto ${css`
              max-width: 80ch;
              width: 100%;
            `}`}
          >
            {content}
          </div>
        </div>
      </div>
    </>
  )
}
