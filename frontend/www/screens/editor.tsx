import React, {useState, useReducer, useCallback} from 'react'
import {Editor as SlateEditor, Transforms, Node, Range} from 'slate'
import {css} from 'emotion'
import {useMutation, queryCache} from 'react-query'
import {v4 as uuid} from 'uuid'
import {
  Icons,
  nodeTypes,
  Editor as MintterEditor,
  Toolbar,
  useEditor,
  plugins as editorPlugins,
  initialBlocksValue,
  EditorComponent,
  HelperToolbar,
  useHelper,
  ELEMENT_BLOCK,
  ELEMENT_BLOCK_LIST,
  useEditorValue,
  EditorState,
  BlockToolsProvider,
  toSlateTree,
  toSlateBlocksDictionary,
  TransclusionHelperProvider,
  options,
  createPlugins,
} from '@mintter/editor'
import ResizerStyle from '../components/resizer-style'
import {useEditor as useSlateEditor, ReactEditor} from 'slate-react'
import Tippy from '@tippyjs/react'
import SplitPane from 'react-split-pane'
import Seo from 'components/seo'
import EditorHeader from 'components/editor-header'
import {DebugValue} from 'components/debug'
import Textarea from 'components/textarea'
import {Document} from '@mintter/proto/v2/documents_pb'
import {markdownToSlate} from 'shared/markdownToSlate'
import {useDebounce} from 'shared/hooks'
import {useMintter} from 'shared/mintterContext'
import {useParams, useHistory} from 'react-router-dom'
import {FullPageSpinner} from 'components/fullPageSpinner'
import {FullPageErrorMessage} from 'components/errorMessage'
import Layout from 'components/layout'
import Container from 'components/container'
import {useTheme} from 'shared/themeContext'
import {BlockRefList} from '@mintter/proto/v2/documents_pb'
import {Page} from 'components/page'
import {MainColumn} from 'components/main-column'

interface InteractionPanelAction {
  type: string
  payload: string
}

interface InteractionPanelState {
  visible: boolean
  objects: string[]
}

function objectsReducer(
  state: InteractionPanelState,
  {type, payload}: InteractionPanelAction,
): InteractionPanelState {
  if (type === 'add_object') {
    if (state.objects.includes(payload)) {
      return {
        ...state,
        visible: true,
      }
    }

    return {
      visible: true,
      objects: [...state.objects, payload],
    }
  }

  if (type === 'toggle_panel') {
    return {
      ...state,
      visible: !state.visible,
    }
  }

  if (type === 'open_panel') {
    return {
      ...state,
      visible: true,
    }
  }

  if (type === 'close_panel') {
    return {
      ...state,
      visible: false,
    }
  }

  return state
}

export default function Editor(): JSX.Element {
  const {push} = useHistory()
  const {version} = useParams()
  const {theme} = useTheme()

  const [interactionPanel, interactionPanelDispatch] = React.useReducer(
    objectsReducer,
    {
      visible: false,
      objects: [],
    },
  )

  const editorOptions = {
    ...options,
    transclusion: {
      ...options.transclusion,
      customProps: {
        dispatch: interactionPanelDispatch,
      },
    },
  }
  const plugins = createPlugins(editorOptions)
  const editor: ReactEditor = useEditor(plugins, editorOptions) as ReactEditor
  const wrapperRef = React.useRef<HTMLDivElement>(null)
  const editorContainerRef = React.useRef<HTMLDivElement>(null)
  const titleRef = React.useRef(null)
  const subtitleRef = React.useRef(null)
  const [readyToAutosave, setReadyToAutosave] = React.useState<boolean>(false)

  const {getDocument, setDocument, publishDraft, listDrafts} = useMintter()
  const saveDocument = React.useMemo(() => setDocument(editor), [editor])
  const {status, error, data} = getDocument(version, {
    onSuccess: () => {
      setReadyToAutosave(true)
    },
  })

  const {state, setTitle, setSubtitle, setBlocks, setValue} = useEditorValue({
    document: data,
  })
  const {title, blocks, subtitle} = state

  const [autosaveDraft] = useMutation(
    async state => {
      const {document} = data.toObject()
      const {id, version, author} = document
      saveDocument({document, state})
    },
    {
      onSuccess: () => {
        queryCache.setQueryData(['Document', version], data)
      },
    },
  )

  const debouncedValue = useDebounce(state, 1000)

  React.useEffect(() => {
    if (readyToAutosave) {
      autosaveDraft(state)
    }
  }, [debouncedValue])

  async function handlePublish() {
    publishDraft(version as string, {
      onSuccess: publication => {
        const doc = publication.toObject()
        push(`/p/${doc.version}`)
      },
    })
  }

  if (status === 'loading') {
    return <FullPageSpinner />
  }

  if (status === 'error') {
    return <FullPageErrorMessage error={error} />
  }

  return (
    <>
      <Seo title="Editor" />
      <DebugValue value={state} />
      <ResizerStyle />
      <Page>
        <SplitPane
          style={{
            height: '100%',
            width: '100%',
          }}
          split="vertical"
          maxSize={-100}
          defaultSize="66%"
          minSize={300}
          pane1Style={
            interactionPanel.visible
              ? {
                  minWidth: 600,
                  overflow: 'auto',
                }
              : {
                  width: '100%',
                  minWidth: '100%',
                  height: '100%',
                  minHeight: '100%',
                  overflow: 'auto',
                }
          }
          pane2Style={{
            overflow: 'auto',
          }}
        >
          <div className="overflow-auto">
            <div className="px-4 flex justify-end pt-4">
              <button
                onClick={handlePublish}
                className="bg-primary rounded-full px-12 py-2 text-white font-bold shadow transition duration-200 hover:shadow-lg ml-4"
              >
                Publish
              </button>
              <button
                onClick={() => interactionPanelDispatch({type: 'toggle_panel'})}
                className="ml-4 px-4 py-2 text-sm"
              >
                toggle sidepanel
              </button>
            </div>

            <MainColumn>
              <div
                className={`pb-2 mb-4 relative ${css`
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
                <Textarea
                  ref={t => {
                    titleRef.current = t
                  }}
                  value={title}
                  data-test-id="editor_title"
                  onChange={setTitle}
                  name="title"
                  placeholder="Document title"
                  className={`text-4xl text-heading font-bold italic`}
                  onEnterPress={() => {
                    subtitleRef.current.focus()
                  }}
                />
                <Textarea
                  ref={d => {
                    subtitleRef.current = d
                  }}
                  value={subtitle}
                  onChange={setSubtitle}
                  name="subtitle"
                  placeholder="Subtitle"
                  className={`leading-relaxed text-lg font-light text-heading-muted italic`}
                  onEnterPress={() => {
                    ReactEditor.focus(editor)
                  }}
                />
              </div>

              <EditorComponent
                editor={editor}
                plugins={plugins}
                value={blocks}
                onChange={blocks => {
                  setBlocks(blocks)
                }}
                theme={theme}
              />
            </MainColumn>
          </div>
          {interactionPanel.visible ? (
            <div
              className="pt-4"
              style={{
                visibility: interactionPanel.visible ? 'visible' : 'hidden',
                maxWidth: interactionPanel.visible ? '100%' : 0,
                width: interactionPanel.visible ? '100%' : 0,
                height: '100%',
                minHeight: '100%',
                overflow: 'auto',
                zIndex: 0,
              }}
            >
              {interactionPanel.objects.map(object => (
                <InteractionPanelObject id={object} />
              ))}
            </div>
          ) : (
            <div />
          )}
        </SplitPane>
      </Page>
    </>
  )
}

function InteractionPanelObject({id}) {
  const foo = true
  return (
    <div className="p-4 border rounded m-4 break-words whitespace-pre-wrap">
      {id}
    </div>
  )
}
