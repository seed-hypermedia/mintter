import React from 'react'
import {css} from 'emotion'
import {useMutation} from 'react-query'
import {
  Icons,
  useEditor,
  EditorComponent,
  useEditorValue,
  options,
  createPlugins,
} from '@mintter/editor'
import {ReactEditor} from 'slate-react'
import Tippy from '@tippyjs/react'
import SplitPane from 'react-split-pane'
import Seo from 'components/seo'
import {DebugValue} from 'components/debug'
import Textarea from 'components/textarea'
import {useDebounce} from 'shared/hooks'
import {useDocument, useMintter} from 'shared/mintterContext'
import {getDocument, getProfile} from 'shared/mintterClient'
import {publishDraft} from 'shared/mintterClient'
import {useParams, useHistory, useLocation} from 'react-router-dom'
import {FullPageSpinner} from 'components/fullPageSpinner'
import {FullPageErrorMessage} from 'components/errorMessage'
import {useTheme} from 'shared/themeContext'
import {Page} from 'components/page'
import {MainColumn} from 'components/main-column'
import {SidePanelObject} from 'components/sidePanelObject'
import {useTransclusion} from 'shared/useTransclusion'
import {useSidePanel} from 'components/sidePanel'
import {Profile} from '@mintter/api/v2/mintter_pb'

function useQuery() {
  return new URLSearchParams(useLocation().search)
}

export default function Editor(): JSX.Element {
  const {push} = useHistory()
  const {version} = useParams()
  const {theme} = useTheme()
  const query = useQuery()
  const {state: sidePanel, dispatch: sidePanelDispatch} = useSidePanel()

  const editorOptions = {
    ...options,
    transclusion: {
      ...options.transclusion,
      customProps: {
        dispatch: sidePanelDispatch,
        getData: getTransclusionData,
      },
    },
    block: {
      ...options.block,
      customProps: {
        dispatch: sidePanelDispatch,
      },
    },
  }
  const plugins = createPlugins(editorOptions)
  const editor: ReactEditor = useEditor(plugins, editorOptions) as ReactEditor

  const titleRef = React.useRef(null)
  const subtitleRef = React.useRef(null)
  const [readyToAutosave, setReadyToAutosave] = React.useState<boolean>(false)

  const {setDocument} = useMintter()
  const saveDocument = React.useMemo(() => setDocument(editor), [editor])
  const {isLoading, isError, error, data} = useDocument(version, {
    onSuccess: () => {
      setReadyToAutosave(true)
    },
  })
  const [publish] = useMutation(publishDraft, {
    onSuccess: publication => {
      const {version} = publication.toObject()

      push(`/p/${version}`)
    },
  })

  const {createTransclusion} = useTransclusion()

  const {state, setTitle, setSubtitle, setBlocks} = useEditorValue({
    document: data,
  })
  const {title, blocks, subtitle, mentions} = state

  React.useEffect(() => {
    if (mentions.length) {
      sidePanelDispatch({type: 'add_object', payload: mentions})
    }

    const object = query.get('object')
    if (object) {
      sidePanelDispatch({type: 'add_object', payload: object})
    }
  }, [])

  const [autosaveDraft] = useMutation(async state => {
    if (data.document) {
      saveDocument({document: data.document, state})
    } else {
      console.error('no document???')
    }
  })

  const debouncedValue = useDebounce(state, 1000)

  React.useEffect(() => {
    if (readyToAutosave) {
      autosaveDraft(state)
    }

    return () => {
      // unmount screen, autosave.
      autosaveDraft(state)
    }
  }, [debouncedValue])

  async function getTransclusionData(transclusionId) {
    const version = transclusionId.split('/')[0]
    const res = await getDocument('', version)
    const data = res.toObject()
    const {document} = data
    const authorId = data.document.author
    const authorData = await getProfile('', authorId)
    const author: Profile.AsObject = authorData.toObject()

    return {
      document,
      author,
    }
  }

  async function handlePublish() {
    await saveDocument({document: data.document, state})
    publish(version as string)
  }

  if (isLoading) {
    return <FullPageSpinner />
  }

  if (isError) {
    return <FullPageErrorMessage error={error} />
  }

  return (
    <Page>
      <Seo title="Compose" />
      <DebugValue value={state} />
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
          sidePanel.visible
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
            <Tippy
              content={
                <span
                  className={`px-2 py-1 text-xs font-light transition duration-200 rounded bg-muted-hover ${css`
                    background-color: #333;
                    color: #ccc;
                  `}`}
                >
                  Interact with this document
                </span>
              }
            >
              <button
                onClick={() => sidePanelDispatch({type: 'toggle_panel'})}
                className="ml-4 text-sm text-muted-hover hover:text-toolbar transform -rotate-180 transition duration-200 outline-none"
              >
                <Icons.Sidebar color="currentColor" />
              </button>
            </Tippy>
          </div>

          <MainColumn
            className={`mx-4 md:mx-16 ${css`
              max-width: 50ch;
            `}`}
          >
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
                className={`text-2xl md:text-4xl text-heading font-bold italic leading-tight ${css`
                  word-wrap: break-word;
                  white-space: pre-wrap;
                  min-height: 56px;
                `}`}
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
                className={`text-md md:text-lg font-light text-heading-muted italic mt-4 leading-tight ${css`
                  word-wrap: break-word;
                  white-space: pre-wrap;
                  min-height: 28px;
                `}`}
                onEnterPress={() => {
                  ReactEditor.focus(editor)
                }}
              />
            </div>
            <div className="prose prose-xl">
              <EditorComponent
                editor={editor}
                plugins={plugins}
                value={blocks}
                onChange={blocks => {
                  setBlocks(blocks)
                }}
                theme={theme}
              />
            </div>
          </MainColumn>
        </div>
        {sidePanel.visible ? (
          <div
            className="bg-background-muted"
            style={{
              visibility: sidePanel.visible ? 'visible' : 'hidden',
              maxWidth: sidePanel.visible ? '100%' : 0,
              width: sidePanel.visible ? '100%' : 0,
              height: '100%',
              minHeight: '100%',
              overflow: 'auto',
              zIndex: 0,
            }}
          >
            <ul aria-label="sidepanel list">
              {sidePanel.objects.map(object => (
                <SidePanelObject
                  key={object}
                  isEditor
                  id={object}
                  createTransclusion={createTransclusion}
                />
              ))}
            </ul>
          </div>
        ) : (
          <div />
        )}
      </SplitPane>
    </Page>
  )
}
