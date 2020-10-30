import React, {useReducer, useCallback, useState} from 'react'
import Tippy from '@tippyjs/react'
import {Editor as SlateEditor, Transforms, Node, Range} from 'slate'
import {Slate, ReactEditor} from 'slate-react'
import slugify from 'slugify'
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
import {useInteractionPanel} from 'components/interactionPanel'

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
  const {push, replace} = useHistory()
  const {slug} = useParams()
  const {
    state: interactionPanel,
    dispatch: interactionPanelDispatch,
  } = useInteractionPanel()

  const [showReactions, toggleReactions] = React.useState(false)

  let version = React.useMemo(() => slug.split('-').slice(-1)[0], [slug])

  const {createDraft} = useMintter()

  async function handleInteract() {
    const d = await createDraft()

    const value = d.toObject()
    push(`/private/editor/${value.version}?object=${version}`)
  }

  const editorOptions = {
    ...options,
    transclusion: {
      ...options.transclusion,
      customProps: {
        dispatch: interactionPanelDispatch,
      },
    },
    block: {
      ...options.block,
      customProps: {
        dispatch: interactionPanelDispatch,
      },
    },
  }
  const plugins = createPlugins(editorOptions)
  const editor: ReactEditor = useEditor(plugins, editorOptions) as ReactEditor
  const {status, error, data, isFetching, failureCount} = useDocument(version)
  console.log('data', data)
  const {state, setValue} = useEditorValue({
    document: data,
  })
  const {title, blocks, subtitle, author: pubAuthor, mentions} = state
  React.useEffect(() => {
    if (!slug.includes('-') && title) {
      console.log('no incluye!', title)
      const titleSlug = slugify(title, {lower: true, remove: /[*+~.()'"!:@]/g})
      replace(`${titleSlug}-${version}`)
    }
  }, [title])
  const {data: author} = useAuthor(pubAuthor)

  React.useEffect(() => {
    if (mentions.length) {
      interactionPanelDispatch({
        type: 'add_mentions',
        payload: {objects: mentions},
      })
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
        <div className="prose xs:prose-xl md:prose-xl lg:prose-2xl 2xl:prose-3xl pt-4">
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
            {/* <div className="px-4 flex justify-end pt-4">
              <Tippy
                content={
                  <span
                    className={`px-2 py-1 text-xs font-light transition duration-200 rounded bg-muted-hover ${css`
                      background-color: #333;
                      color: white;
                    `}`}
                  >
                    Interact with this document
                  </span>
                }
              >
                <button
                  onClick={() =>
                    interactionPanelDispatch({type: 'toggle_panel'})
                  }
                  className="ml-4 text-sm text-muted-hover hover:text-toolbar  outline-none relative"
                >
                  {interactionPanel.objects.length > 0 && (
                    <div className={`bg-primary z-10 border-2 border-white w-3 h-3 rounded-full absolute ${css`
                      top: -4px;
                      right: -4px;
                    `}`} />
                  )}
                  <div className="block transform -rotate-180 transition duration-200">
                    <Icons.Sidebar color="currentColor" />
                  </div>
                </button>
              </Tippy>
            </div> */}
            <PublicationCTA
              visible={interactionPanel.visible}
              handleInteract={() => {
                interactionPanelDispatch({type: 'toggle_panel'})
              }}
            />
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
              <div className="mx-4 flex items-center justify-between mt-4">
                <MintterIcon size="1.5em" />
                <button
                  className="text-primary text-base font-bold flex items-center w-full justify-end group"
                  onClick={() =>
                    interactionPanelDispatch({type: 'close_panel'})
                  }
                >
                  <span className="text-sm mx-2">Close Interaction Panel</span>
                  <span className="w-4 h-4 rounded-full bg-background-muted text-primary flex items-center justify-center group-hover:bg-muted transform duration-200">
                    <Icons.ChevronRight size={14} color="currentColor" />
                  </span>
                </button>
              </div>
              <div className="py-6 border-t border-muted mx-4 mt-2">
                <p className="text-muted-hover font-bold text-xs">Reactions</p>
                <div className="flex items-center mt-4">
                  <p className="text-sm">
                    {interactionPanel.objects.length === 0
                      ? 'No Reactions'
                      : interactionPanel.objects.length === 1
                      ? '1 Reaction'
                      : `${interactionPanel.objects.length} Reactions`}{' '}
                  </p>
                  <button
                    className="font-bold text-primary mx-2 text-sm"
                    onClick={() => toggleReactions(val => !val)}
                  >
                    {showReactions ? 'Hide ' : 'Show '}Reactions
                  </button>
                </div>
              </div>

              {showReactions &&
                interactionPanel.objects.map(object => (
                  <InteractionPanelObject key={object} id={object} />
                ))}
              <InteractionPanelCTA handleInteract={handleInteract} />
            </div>
          ) : (
            <div />
          )}
        </SplitPane>
      </Page>
    </>
  )
}

function MintterIcon({size = '1em'}) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none">
      <rect width={32} height={32} rx={4} fill="#5200FF" />
      <path
        d="M14.74 15.995v4.002c0 .55-.44 1.003-.976 1.003-.537 0-.968-.452-.968-1.003v-4.002c0-.55-.44-1.003-.977-1.003-.536 0-.977.452-.977 1.003v4.002c0 .55-.44 1.003-.977 1.003-.536 0-.967-.452-.967-1.003v-4.002c0-.55-.44-1.003-.977-1.003-.536 0-.977.452-.977 1.003v4.002c0 .55-.44 1.003-.977 1.003C5.431 21 5 20.548 5 19.997v-4.002c0-1.652 1.312-2.999 2.921-2.999a2.88 2.88 0 011.944.767 2.834 2.834 0 011.945-.767c1.618 0 2.93 1.347 2.93 3zm5.01-2.645c-.537 0-.977.452-.977 1.003 0 .55.44 1.003.977 1.003.536 0 .977-.452.977-1.003a.988.988 0 00-.977-1.003zm.977 7.247c.469-.276.622-.885.354-1.367a.957.957 0 00-1.331-.364.967.967 0 01-.489.138c-.536 0-.977-.452-.977-1.003v-5.998c0-.55-.44-1.003-.977-1.003-.536 0-.977.452-.977 1.003V18c0 1.652 1.313 2.999 2.922 2.999.526 0 1.034-.138 1.475-.403zm4.817-7.945c-.536 0-.977.452-.977 1.003 0 .55.44 1.003.977 1.003.537 0 .977-.452.977-1.003 0-.55-.44-1.003-.977-1.003zm.968 7.945c.469-.276.622-.885.354-1.367a.957.957 0 00-1.331-.364.967.967 0 01-.489.138c-.536 0-.977-.452-.977-1.003v-5.998A.98.98 0 0023.102 11c-.537 0-.977.452-.977 1.003V18c0 1.652 1.312 2.999 2.921 2.999a2.84 2.84 0 001.466-.403z"
        fill="#fff"
      />
    </svg>
  )
}

function PublicationCTA({handleInteract, visible}) {
  return (
    <div
      className={`absolute right-0 p-12 pt-0 w-full max-w-sm text-right transform duration-200 ${
        visible
          ? 'opacity-0 pointer-events-none'
          : 'opacity-100 pointer-events-auto'
      }`}
    >
      <p className="text-gray-800 font-light text-sm pt-4">
        Document created via <strong className="font-bold">Mintter App.</strong>
      </p>
      <p className="text-gray-800 text-sm pt-4 font-light">
        Mintter is a distributed content publisher, that guarantees Your
        Content’s{' '}
        <strong className="font-bold">Ownership, Authorship, Atribution</strong>{' '}
        and <strong className="font-bold">Traceability.</strong>
      </p>
      <button
        className="mt-4 text-primary text-base font-bold flex items-center w-full justify-end group"
        onClick={handleInteract}
      >
        <span className="w-6 h-6 rounded-full bg-background-muted mr-2 text-primary flex items-center justify-center group-hover:bg-muted transform duration-200 ">
          <Icons.ChevronLeft size={16} color="currentColor" />
        </span>
        <span className="font-bold">Interact with this document</span>
      </button>
    </div>
  )
}

function InteractionPanelCTA({handleInteract}) {
  const {push} = useHistory()
  return (
    <div className="border-t border-muted mt-4 py-8 px-4 mb-20">
      <h3 className="font-bold text-2xl">
        Want to add your thougts to this subject?
      </h3>
      <p className="mt-4">
        <strong>Reply, develop</strong> or <strong>refute</strong> on the
        Mintter app now.
      </p>
      <button
        className="bg-primary rounded-full mt-4 px-8 py-2 text-white font-bold shadow transition duration-200 text-sm"
        onClick={handleInteract}
      >
        Write a reply
      </button>
    </div>
  )
}
