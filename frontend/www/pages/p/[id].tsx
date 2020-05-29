import React, {useReducer, useCallback} from 'react'
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
import {
  useFetchPublication,
  getBatchPublicationSections,
} from 'shared/publications'
import {markdownToSlate} from 'shared/markdownToSlate'

interface EditorState {
  title: string
  description: string
  sections: Node[]
}

function draftReducer(state: EditorState, action) {
  const {type, payload} = action

  switch (type) {
    case 'TITLE':
      return {
        ...state,
        title: payload,
      }
    case 'DESCRIPTION': {
      return {
        ...state,
        description: payload,
      }
    }
    case 'SECTIONS': {
      return {
        ...state,
        sections: payload,
      }
    }

    case 'VALUE': {
      return {
        ...state,
        ...payload,
      }
    }

    default: {
      return state
    }
  }
}

function useEditorValue() {
  const [state, dispatch] = useReducer(
    draftReducer,
    initialValue,
    initializeEditorValue,
  )

  const setTitle = useCallback(payload => {
    dispatch({type: 'TITLE', payload})
  }, [])

  const setDescription = useCallback(payload => {
    dispatch({type: 'DESCRIPTION', payload})
  }, [])

  const setSections = useCallback(payload => {
    dispatch({type: 'SECTIONS', payload})
  }, [])

  const setValue = useCallback(payload => {
    dispatch({type: 'VALUE', payload})
  }, [])

  return {
    state,
    setTitle,
    setDescription,
    setSections,
    setValue,
  }
}

const initialValue: EditorState = {
  title: '',
  description: '',
  sections: initialSectionsValue,
}

function initializeEditorValue() {
  // TODO: change this to a lazy initialization function later
  return initialValue
}

export default function EditorPage(): JSX.Element {
  const plugins = [...editorPlugins, SoftBreakPlugin()]
  const editor: ReactEditor = useEditor(plugins) as ReactEditor
  const {
    state,
    setTitle,
    setDescription,
    setSections,
    setValue,
  } = useEditorValue()

  const {
    query: {id},
  } = useRouter()

  const {title, sections, description} = state

  function isEmpty(): boolean {
    return sections
      ? sections.length === 1 && Node.string(sections[0]) === ''
      : false
  }

  const {status, error, data} = useFetchPublication(id)

  React.useEffect(() => {
    if (data) {
      const obj = data.toObject()
      getBatchPublicationSections(obj.sectionsList).then(res => {
        const sections = res
          .getSectionsList()
          .map((f: Section) => f.toObject())
          .map(s => ({
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
          createTime: obj.createTime,
        })
      })
    }
  }, [data])

  return (
    <>
      <Seo title="Publication | Mintter" />
      <div className="flex-1 overflow-y-auto pt-4 overflow-y-scroll">
        {status === 'loading' ? (
          <p>Loading...</p>
        ) : status === 'error' ? (
          <p>ERROR! == {error}</p>
        ) : (
          <>
            <EditorHeader onPublish={() => publish(state, id)} />
            <div className="flex pt-8 pb-32 relative">
              <DebugValue
                value={state}
                className="absolute z-10 right-0 top-0 w-full max-w-xs"
              />
              <div
                className={`w-full pr-4 absolute xl:sticky left-0 top-0 self-start mx-4 opacity-0 pointer-events-none xl:opacity-100 xl:pointer-events-auto transition duration-200 ${css`
                  max-width: 300px;
                `}`}
              >
                {/* <div className="">
                  <p className="font-semibold text-heading text-xl">
                    {title || 'Untitled document'}
                  </p>
                </div> */}
              </div>
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
                    onChange={sections => {
                      setSections(sections)
                    }}
                  >
                    <div
                      className={`${css`
                        word-break: break-word;
                      `}`}
                    >
                      <div
                        className={`mb-12 mx-8 pb-6 relative ${css`
                          &:after {
                            content: '';
                            position: absolute;
                            bottom: 0;
                            left: 0;
                            width: 50%;
                            max-width: 360px;
                            height: 1px;
                            z-index: 20;
                            background-color: var(--color-muted-hover);
                          }
                        `}`}
                      >
                        <h1 className={`text-4xl text-heading font-bold`}>
                          {title}
                        </h1>
                        <p
                          className={`text-lg font-light text-heading-muted italic mt-3`}
                        >
                          {description}
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
