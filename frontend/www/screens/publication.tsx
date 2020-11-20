import React from 'react'
import {ReactEditor} from 'slate-react'
import slugify from 'slugify'
import {
  Icons,
  useEditor,
  createPlugins,
  EditorComponent,
  useEditorValue,
  options,
  useBlockMenu,
  SlateBlock,
} from '@mintter/editor'
import Seo from 'components/seo'
import {getDocument, getProfile} from 'shared/mintterClient'

import {css} from 'emotion'
import {useParams, useHistory, useLocation} from 'react-router-dom'
import {useDocument, useDrafts, useMintter} from 'shared/mintterContext'
import {useAuthor, useProfileAddrs} from 'shared/profileContext'
import {ErrorMessage} from 'components/errorMessage'
import {AuthorLabel} from 'components/author-label'
import {useTransclusion} from 'shared/useTransclusion'
import {isLocalhost} from 'shared/isLocalhost'
import {Page} from 'components/page'
import {MainColumn} from 'components/main-column'
import SplitPane from 'react-split-pane'
import ResizerStyle from 'components/resizer-style'
import {SidePanelObject} from 'components/sidePanelObject'
import {useSidePanel} from 'components/sidePanel'
import {Profile} from '@mintter/api/v2/mintter_pb'
import {Document} from '@mintter/api/v2/documents_pb'
import Modal from 'react-modal'
import {useToasts} from 'react-toast-notifications'
import {useTheme} from 'shared/themeContext'

Modal.setAppElement('#__next')

export default function Publication(): JSX.Element {
  const location = useLocation()
  const query = new URLSearchParams(location.search)
  const isModalOpen = query.get('modal')
  const {data: profileAddress} = useProfileAddrs()
  const {addToast} = useToasts()
  const {theme} = useTheme()
  const {dispatch} = useBlockMenu()

  const {push, replace} = useHistory()
  const {slug} = useParams()
  const {state: sidePanel, dispatch: sidePanelDispatch} = useSidePanel()

  const version = React.useMemo(() => slug.split('-').slice(-1)[0], [slug])

  const {createDraft} = useMintter()

  async function handleInteract() {
    if (isLocalhost(window.location.hostname)) {
      const d = await createDraft()

      const value = d.toObject()
      push(`/private/editor/${value.version}?object=${version}`)
      return
    } else {
      push(
        `${location.pathname}${
          location.search ? `${location.search}&modal=show` : '?modal=show'
        }`,
      )
    }
  }

  function handleMainPanel(mentionId: string) {
    push(`/p/${mentionId}`)
  }

  function handlesidePanel(blockId: string) {
    sidePanelDispatch({
      type: 'add_object',
      payload: blockId,
    })
  }

  const onQuote = React.useCallback(handleQuotation, [])
  const onSidePanel = React.useCallback(handlesidePanel, [])
  const onMainPanel = React.useCallback(handleMainPanel, [])

  const editorOptions = {
    ...options,
    transclusion: {
      ...options.transclusion,
      customProps: {
        dispatch: sidePanelDispatch,
        getData: getQuotationData,
      },
    },
    block: {
      ...options.block,
      customProps: {
        dispatch: sidePanelDispatch,
        getData: getQuotationData,
        onMainPanel,
        onSidePanel,
      },
    },
  }
  const plugins = createPlugins(editorOptions)
  const editor: ReactEditor = useEditor(plugins, editorOptions) as ReactEditor
  const {error, data, isLoading, isError} = useDocument(version)
  const {state} = useEditorValue({
    document: data,
  })
  const {title, blocks, subtitle, author: pubAuthor} = state
  const {data: author} = useAuthor(pubAuthor)
  const {createTransclusion} = useTransclusion()
  const {data: drafts = []} = useDrafts()

  async function handleQuotation({
    block,
    destination,
  }: {
    block: SlateBlock
    destination?: Document.AsObject
  }) {
    const draftUrl = await createTransclusion({
      source: version,
      destination: destination ? destination.version : undefined,
      block: block,
    })

    push(`/private/editor/${draftUrl}`)
  }

  React.useEffect(() => {
    if (!slug.includes('-') && title) {
      const titleSlug = slugify(title, {lower: true, remove: /[*+~.()'"!:@]/g})
      replace(`${titleSlug}-${version}`)
    }
  }, [title])

  async function getQuotationData(quoteId) {
    const version = quoteId.split('/')[0]
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

  React.useEffect(() => {
    dispatch({
      type: 'set_actions',
      payload: {
        onQuote,
        onSidePanel,
        useDocument,
        drafts,
      },
    })
  }, [drafts])

  let content

  if (isLoading) {
    content = <p>Loading...</p>
  } else if (isError) {
    content = (
      <div className="mx-8">
        <ErrorMessage error={error} />
      </div>
    )
  } else {
    content = (
      <div className="prose prose-xl pt-4">
        <EditorComponent
          readOnly
          editor={editor}
          plugins={plugins}
          value={blocks}
        />
      </div>
    )
  }

  return (
    <Page>
      <Seo title="Publication" />
      <Modal
        isOpen={!!isModalOpen}
        shouldCloseOnOverlayClick={true}
        shouldCloseOnEsc={true}
        className={`${theme} absolute top-0 mx-auto my-8 max-w-2xl transform -translate-x-1/2 z-50 ${css`
          left: 50%;
        `}`}
        onRequestClose={() => {
          push(location.pathname)
        }}
        contentLabel="Onboarding Modal"
      >
        <div className="bg-background p-8 rounded-2xl shadow-lg outline-none focus:shadow-outline">
          <div className="flex items-center justify-between">
            <MintterIcon size="1.5em" />
            <button
              onClick={() => push(location.pathname)}
              className="text-gray-500 outline-none focus:shadow-outline p-1 w-6 h-6 rounded-full hover:bg-background transition duration-150 flex items-center justify-center"
            >
              <Icons.X size={15} />
            </button>
          </div>
          <div className="mt-8">
            <h1 className="font-bold text-2xl">
              Mintter App download should launch automatically
            </h1>
          </div>
          <div className="mt-8 border-t pt-8">
            <h2 className="text-2xl font-light">
              {`Keep this information handy, in order to access ${
                author ? author.username : 'user'
              }’s document
              in the Mintter App.`}
            </h2>
            <div className="mt-6 flex items-center">
              <button
                className="outline-none focus:shadow-outline text-primary pl-2 pr-4 py-1 font-bold flex items-center rounded-full border-2 border-primary hover:bg-primary hover:text-white transition duration-100"
                onClick={() => {
                  const value = profileAddress.join(',')

                  navigator.clipboard.writeText(value).then(() =>
                    addToast(
                      `${author.username}’s Address copied to your clipboard!`,
                      {
                        appearance: 'success',
                      },
                    ),
                  )
                }}
              >
                <Icons.Copy size={14} color="currentColor" />
                <span className="ml-2">{`Copy ${
                  author ? author.username : 'user'
                }’s user ID`}</span>
              </button>
              <button
                className="outline-none focus:shadow-outline text-primary pl-2 pr-4 py-1 ml-4 font-bold flex items-center rounded-full border-2 border-primary hover:bg-primary hover:text-white transition duration-100"
                onClick={() => {
                  const value = profileAddress.join(',')

                  navigator.clipboard.writeText(value).then(() =>
                    addToast(`Document's UUID copied to your clipboard!`, {
                      appearance: 'success',
                    }),
                  )
                }}
              >
                <Icons.Copy size={14} color="currentColor" />
                <span className="ml-2">Copy Document UUID</span>
              </button>
            </div>
          </div>
        </div>
      </Modal>
      <ResizerStyle />
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
          <PublicationCTA
            visible={sidePanel.visible}
            handleInteract={() => {
              sidePanelDispatch({type: 'toggle_panel'})
            }}
          />
          <MainColumn
            className={`md:mx-16 ${css`
              max-width: 50ch;
            `}`}
          >
            <div
              className={`pb-2 relative mt-6 ${css`
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
                className={`text-2xl md:text-4xl text-heading font-bold italic leading-tight ${css`
                  word-wrap: break-word;
                  white-space: pre-wrap;
                  min-height: 56px;
                `}`}
              >
                {title}
              </h1>
              {subtitle && (
                <p
                  className={`text-md md:text-lg font-light text-heading-muted italic mt-4 leading-tight ${css`
                    word-wrap: break-word;
                    white-space: pre-wrap;
                    min-height: 28px;
                  `}`}
                >
                  {subtitle}
                </p>
              )}
              <p className="text-sm mt-4 text-heading">
                <span>by </span>

                <AuthorLabel author={author} />
              </p>
            </div>
            {content}
          </MainColumn>
        </div>
        {sidePanel.visible ? (
          <div
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
            <div className="mx-4 flex items-center justify-between mt-4">
              <MintterIcon size="1.5em" />
              <button
                className="text-primary text-base flex items-center w-full justify-end group"
                onClick={() => sidePanelDispatch({type: 'close_panel'})}
              >
                <span className="text-sm mx-2">Close Sidepanel</span>
                <span className="w-4 h-4 rounded-full bg-background-muted text-primary flex items-center justify-center group-hover:bg-background transform duration-200">
                  <Icons.ChevronRight size={14} color="currentColor" />
                </span>
              </button>
            </div>

            {sidePanel.objects.map(object => (
              <SidePanelObject key={object} id={object} />
            ))}
            {sidePanel.objects.length === 0 && (
              <SidePanelCTA handleInteract={handleInteract} />
            )}
          </div>
        ) : (
          <div />
        )}
      </SplitPane>
    </Page>
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
      className={`hidden md:block absolute right-0 p-12 pt-0 w-full max-w-sm text-right transform duration-200 ${
        visible
          ? 'opacity-0 pointer-events-none'
          : 'opacity-100 pointer-events-auto'
      }`}
    >
      <p className="text-gray-800 font-light text-sm pt-4">
        Document created via <strong className="font-bold">Mintter App.</strong>
      </p>
      <p className="text-gray-800 text-sm pt-4 font-light">
        Mintter is a distributed publishing platform that brings to your content{' '}
        <strong className="font-bold">Ownership, Authorship, Atribution</strong>{' '}
        and <strong className="font-bold">Traceability.</strong>
      </p>
      <button
        className="mt-4 text-primary text-base font-bold flex items-center w-full justify-end group"
        onClick={handleInteract}
      >
        <span className="w-6 h-6 rounded-full bg-background-muted mr-2 text-primary flex items-center justify-center group-hover:bg-background transform duration-200 ">
          <Icons.ChevronLeft size={16} color="currentColor" />
        </span>
        <span className="font-bold">Interact with this document</span>
      </button>
    </div>
  )
}

function SidePanelCTA({handleInteract}) {
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
        Write about this Article
      </button>
    </div>
  )
}
