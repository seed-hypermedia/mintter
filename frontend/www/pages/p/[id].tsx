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
} from '@mintter/editor'
import {EditablePlugins, SoftBreakPlugin} from 'slate-plugins-next'
import Seo from 'components/seo'
import EditorHeader from 'components/editor-header'
import {DebugValue} from 'components/debug'
import {css} from 'emotion'
import {publish} from 'shared/publishDocument'
import {useRouter} from 'next/router'
import {Section} from '@mintter/proto/documents_pb'
import {getBatchPublicationSections} from 'shared/publications'
import {markdownToSlate} from 'shared/markdownToSlate'
import {useMintter} from 'shared/mintterContext'
import {useQuery} from 'react-query'

interface EditorState {
  title: string
  description: string
  sections: Node[]
  author: string
}

export default function EditorPage(): JSX.Element {
  const plugins = [...editorPlugins, SoftBreakPlugin()]
  const editor: ReactEditor = useEditor(plugins) as ReactEditor
  const [state, setValue] = useState<EditorState>({
    title: '',
    description: '',
    sections: [],
    author: '',
  })
  const {getPublication, getSections} = useMintter()

  const {
    query: {id},
  } = useRouter()

  const {title, sections, description, author} = state

  const {status, error, data} = useQuery(['PublicationId', id], getPublication)

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

  return (
    <>
      <Seo title="Publication" />
      <div className="flex-1 overflow-y-auto pt-4 overflow-y-scroll">
        {status === 'loading' ? (
          <p>Loading...</p>
        ) : status === 'error' ? (
          <p>ERROR! == {error}</p>
        ) : (
          <>
            <EditorHeader />
            <div className="flex pt-8 pb-32 relative">
              <DebugValue
                value={state}
                className="absolute z-10 right-0 top-0 w-full max-w-xs"
              />
              <div
                className={`w-full pr-4 absolute xl:sticky left-0 top-0 self-start mx-4 opacity-0 pointer-events-none xl:opacity-100 xl:pointer-events-auto transition duration-200 ${css`
                  max-width: 300px;
                `}`}
              ></div>
              <div
                className={`flex-1 ${css`
                  @media (min-width: 1280px) {
                    transform: translateX(-150px);
                  }
                `}`}
              >
                <div
                  className={`mx-auto ${css`
                    max-width: 80ch;
                  `} `}
                >
                  <Slate
                    editor={editor}
                    value={sections}
                    onChange={sections => sections}
                  >
                    <div
                      className={`${css`
                        word-break: break-word;
                      `}`}
                    >
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
                          <span className="text-primary hover:text-primary-hover hover:underline hover:cursor-not-allowed">
                            {author}
                          </span>
                        </p>
                      </div>
                      <div className="relative">
                        <EditablePlugins
                          readOnly
                          plugins={plugins}
                          renderElement={[...renderElements]}
                          renderLeaf={[...renderLeafs]}
                          placeholder="Start writing your masterpiece..."
                          spellCheck
                        />
                      </div>
                    </div>
                  </Slate>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </>
  )
}
