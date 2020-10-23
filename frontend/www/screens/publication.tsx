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
import {Document} from '@mintter/api/v2/documents_pb'
import Seo from 'components/seo'
import EditorHeader from 'components/editor-header'
import {DebugValue} from 'components/debug'
import {css} from 'emotion'
import {useParams, useHistory} from 'react-router-dom'
import {useDocument, useDrafts, useMintter} from 'shared/mintterContext'
import {useAuthor} from 'shared/profileContext'
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
} from '@mintter/api/v2/documents_pb'
import {v4 as uuid} from 'uuid'
import {Page} from 'components/page'
import {MainColumn} from 'components/main-column'
import SplitPane from 'react-split-pane'
import ResizerStyle from 'components/resizer-style'
import {InteractionPanelObject} from 'components/interactionPanelObject'

interface InteractionPanelAction {
  type: string
  payload?: any
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

  if (type === 'add_mentions') {
    let newObjects = payload.filter(version => !state.objects.includes(version))
    return {
      ...state,
      visible: false,
      objects: [...state.objects, ...newObjects],
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

  const {createDraft} = useMintter()

  const {status, error, data, isFetching, failureCount} = useDocument(version)
  const {state, setValue} = useEditorValue({
    document: data,
  })
  const {title, blocks, subtitle, author: pubAuthor, mentions} = state
  console.log('mentions!', mentions)
  const {data: author} = useAuthor(pubAuthor)

  React.useEffect(() => {
    if (mentions.length) {
      interactionPanelDispatch({type: 'add_mentions', payload: mentions})
    }
  }, [mentions])

  const {drafts} = useDraftsSelection()
  const {createTransclusion} = useTransclusion({editor})

  async function handleTransclusion({destination, block}) {
    const draftUrl = await createTransclusion({
      source: version,
      destination: destination.version,
      block: block,
    })

    push(`/private/editor/${draftUrl}`)
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
          {subtitle && (
            <p
              className={`leading-relaxed text-lg font-light text-heading-muted italic mt-4 ${css`
                word-wrap: break-word;
                white-space: pre-wrap;
                min-height: 28px;
              `}`}
            >
              {subtitle}
            </p>
          )}
          <p className=" text-sm mt-4 text-heading">
            <span>by </span>

            <AuthorLabel author={author} />
          </p>
        </div>
        <div className="prose xs:prose-xl md:prose-xl lg:prose-2xl 2xl:prose-3xl">
          <EditorComponent
            readOnly
            editor={editor}
            plugins={plugins}
            value={blocks}
            onChange={() => {}}
          />
        </div>
      </>
    )
  }

  return (
    <>
      <Seo title="Publication" />
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
                onClick={() => interactionPanelDispatch({type: 'toggle_panel'})}
                className="ml-4 px-4 py-2 text-sm"
              >
                toggle sidepanel
              </button>
            </div>
            <MainColumn>
              <TransclusionHelperProvider
                options={drafts}
                handleTransclusion={handleTransclusion}
              >
                {content}
              </TransclusionHelperProvider>
            </MainColumn>
          </div>
          {interactionPanel.visible ? (
            <div
              className="bg-background-muted"
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
