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
} from '@mintter/editor'
import {EditablePlugins, SoftBreakPlugin} from 'slate-plugins-next'
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

interface EditorState {
  title: string
  description: string
  sections: Node[]
  author: string
}

export default function Publication(): JSX.Element {
  const plugins = [...editorPlugins, SoftBreakPlugin()]
  const editor: ReactEditor = useEditor(plugins) as ReactEditor
  const [state, setValue] = useState<EditorState>({
    title: '',
    description: '',
    sections: [],
    author: '',
  })
  const {getPublication, getSections, getAuthor} = useMintter()

  const {id} = useParams()

  const {title, sections, description, author: pubAuthor} = state

  const author = getAuthor(pubAuthor)

  const {status, error, data, isFetching, failureCount} = getPublication(id)

  React.useEffect(() => {
    if (data) {
      const obj = data.toObject()
      getSections(obj.sectionsList).then(res => {
        const sections = res
          .getSectionsList()
          .map((f: Section) => f.toObject())
          .map((s: Section.AsObject) => ({
            type: nodeTypes.typeBlock,
            title: s.title,
            description: s.description,
            author: s.author,
            children: markdownToSlate(s.body),
          }))

        setValue({
          title: obj.title,
          description: obj.description,
          sections,
          author: obj.author,
        })
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
            {description}
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
          value={sections}
          onChange={() => {}}
          renderElements={[renderReadOnlyBlockElement()]}
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
