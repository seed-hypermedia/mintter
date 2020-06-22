import React, {useReducer, useCallback, useState} from 'react'
import {Editor as SlateEditor, Transforms, Node, Range} from 'slate'
import {Slate, ReactEditor} from 'slate-react'

import {
  Icons,
  nodeTypes,
  renderElements,
  Editor,
  useEditor,
  plugins as editorPlugins,
  initialSectionsValue,
  // SectionToolbar,
  renderLeafs,
  EditorComponent,
  renderReadOnlySectionElement,
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
  const {getPublication, getSections} = useMintter()
  const {getProfile} = useProfile()

  const {id} = useParams()

  const {title, sections, description, author: pubAuthor} = state

  const author = getProfile(pubAuthor)

  const {status, error, data, isFetching, failureCount} = getPublication(id)
  console.log('{status, error, data}', {
    status,
    error,
    data,
    isFetching,
    failureCount,
  })

  React.useEffect(() => {
    if (data) {
      const obj = data.toObject()
      getSections(obj.sectionsList).then(res => {
        const sections = res
          .getSectionsList()
          .map((f: Section) => f.toObject())
          .map((s: Section.AsObject) => ({
            type: nodeTypes.typeSection,
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
    content = <FullPageSpinner />
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
          className={`mx-8 pb-6 relative mb-px ${css`
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
            className={`text-4xl text-heading font-bold ${css`
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
          renderElements={[renderReadOnlySectionElement()]}
        />
      </>
    )
  }

  return (
    <Layout>
      <Seo title="Publication" />
      <div className="flex-1 overflow-y-auto pt-4 overflow-y-scroll">
        <div className="flex-1 overflow-y-auto">
          {/* <EditorHeader /> */}
          <div className="flex pt-8 pb-32 relative">
            <DebugValue
              value={state}
              className="absolute z-10 right-0 top-0 w-full max-w-xs"
            />
            <div className="flex-1">
              <div
                className={`mx-auto ${css`
                  max-width: 80ch;
                `} `}
              >
                {content}
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  )
}
