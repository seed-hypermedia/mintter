import React from 'react'
import {css} from 'emotion'
import SplitPane from 'react-split-pane'
import {useHistory, useParams, useRouteMatch} from 'react-router-dom'
import {ReactEditor} from 'slate-react'
import slugify from 'slugify'
import {createPlugins} from 'editor/plugins'
import {EditorComponent} from 'components/editor'
import {options} from 'editor/options'
import {toSlateTree} from 'editor/transformers/transformers'
import {useEditor} from 'shared/use-editor'
import {useBlockMenuDispatch} from 'editor/block-plugin/components/blockmenu-context'
import {Icons} from 'components/icons'
import {Document} from '@mintter/api/v2/documents_pb'
import {useToasts} from 'react-toast-notifications'
import {SidePanelObject} from 'components/sidepanel-object'
import {AuthorLabel} from 'components/author-label'
import {PublicationModal} from 'components/publication-modal'
import {useDocument, useDrafts} from 'shared/mintter-context'
import {useAuthor, useProfile} from 'shared/profile-context'
import {ErrorMessage} from 'components/error-message'
import {MainColumn} from 'components/main-column'
import {Page} from 'components/page'
import Seo from 'components/seo'
import {useSidePanel} from 'components/sidepanel'
import {MintterIcon} from 'components/mintter-icon'
import * as apiClient from 'shared/mintter-client'
import {queryCache, useMutation} from 'react-query'
import {isLocalhost} from 'shared/is-localhost'
import {getPath} from 'components/routes'
import {useTransclusion} from 'shared/use-transclusion'
import {Profile} from '@mintter/api/v2/mintter_pb'
import {SlateBlock} from 'editor/editor'

export default function Publication() {
  const match = useRouteMatch()
  const history = useHistory()
  const {addToast} = useToasts()

  // request document
  const {isLoading, isError, error, data, value} = usePublication()

  //sidepanel state
  const {state: sidePanel, dispatch: sidePanelDispatch} = useSidePanel()

  // get Drafts for editorOptions
  const {data: drafts = []} = useDrafts()

  // draftCreation
  const [createDraft] = useMutation(apiClient.createDraft, {
    onSuccess: () => {
      queryCache.refetchQueries('Drafts')
    },
  })

  // block menu dispatch
  const blockMenuDispatch = useBlockMenuDispatch()

  // transclusions
  const {createTransclusion} = useTransclusion()

  async function handleInteract() {
    if (
      getPath(match).includes('admin') ||
      isLocalhost(window.location.hostname)
    ) {
      const d = await createDraft()

      const value = d.toObject()
      history.push(
        `${getPath(match)}/editor/${value.version}?object=${
          data.document?.version
        }`,
      )
    } else {
      history.push(
        `${location.pathname}${
          location.search ? `${location.search}&modal=show` : '?modal=show'
        }`,
      )
    }
  }

  const handleQuotation = (document: Document.AsObject) => async ({
    block,
    destination,
  }: {
    block: SlateBlock
    destination?: Document.AsObject
  }) => {
    const draftUrl = await createTransclusion({
      source: document.version,
      destination: destination ? destination.version : undefined,
      block: block,
    })

    history.push(`${getPath(match)}/editor/${draftUrl}`)
  }

  function handleMainpanel(mentionId: string) {
    history.push(`${getPath(match)}/p/${mentionId}`)
  }

  const handleSidepanel = (document: Document.AsObject) => (
    blockId: string,
  ) => {
    const objectId = blockId.includes('/')
      ? blockId
      : `${document.version}/${blockId}`

    sidePanelDispatch({
      type: 'add_object',
      payload: objectId,
    })
  }

  const {data: user, isSuccess: isProfileSuccess} = useProfile()
  const isAuthor = React.useCallback(author => user.accountId === author, [
    data,
  ])

  async function getQuoteData(quoteId) {
    const isLocal = isLocalhost(window.location.hostname)
    const version = quoteId.split('/')[0]
    const res = await apiClient.getDocument('Document', version)
    const data = res.toObject()
    const {document} = data
    const authorId = data.document.author
    const authorData = await apiClient.getProfile('', authorId)
    const author: Profile.AsObject = authorData.toObject()

    return {
      document,
      author,
      isVisibleInMainPanel:
        isLocal || (isProfileSuccess && isAuthor(author.accountId)),
    }
  }

  function onCopyBlockId(blockId: string) {
    const id = blockId.includes('/')
      ? blockId
      : `${data.document?.version}/${blockId}`
    const res = copyTextToClipboard(id)
    if (res) {
      addToast('Block Ref copied to your clipboard!', {
        appearance: 'success',
      })
    } else {
      addToast('Error while copying to Clipboard!', {
        appearance: 'error',
      })
    }
  }

  const onQuote = React.useCallback(handleQuotation(data?.document), [data])
  const onSidePanel = React.useCallback(handleSidepanel(data?.document), [data])
  const onMainPanel = React.useCallback(handleMainpanel, [])

  const editorOptions = {
    ...options,
    transclusion: {
      ...options.transclusion,
      customProps: {
        dispatch: sidePanelDispatch,
        getData: getQuoteData,
      },
    },
    block: {
      ...options.block,
      customProps: {
        dispatch: sidePanelDispatch,
        getData: getQuoteData,
        onMainPanel,
        onSidePanel,
      },
    },
  }

  // create editor
  const plugins = createPlugins(editorOptions)
  const editor = useEditor(plugins, options) as ReactEditor

  React.useEffect(() => {
    blockMenuDispatch({
      type: 'set_actions',
      payload: {
        onQuote,
        onCopyBlockId,
        onSidePanel,
        useDocument,
        drafts,
      },
    })
  }, [onQuote, onSidePanel, useDocument, drafts])

  // start rendering
  if (isLoading) {
    return <p className="text-body">Loading...</p>
  }

  if (isError) {
    return <ErrorMessage error={error} />
  }

  return (
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
            className={`pr-16 md:pr-4 md:mx-16 ${css`
              max-width: 50ch;
            `}`}
          >
            <PublicationHeader document={data.document} />
            <div className="prose prose-xl pt-4">
              {value && (
                <EditorComponent
                  readOnly
                  editor={editor}
                  plugins={plugins}
                  value={value}
                />
              )}
            </div>
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
                <span className="w-4 h-4 rounded-full bg-background-muted text-primary flex items-center justify-center group-hover:bg-background-muted transform duration-200">
                  <Icons.ChevronRight size={14} color="currentColor" />
                </span>
              </button>
            </div>
            <ul aria-label="sidepanel list">
              {sidePanel.objects.map(object => (
                <SidePanelObject key={object} id={object} />
              ))}
            </ul>
            {sidePanel.objects.length === 0 && (
              <SidePanelCTA handleInteract={handleInteract} />
            )}
          </div>
        ) : (
          <div />
        )}
      </SplitPane>
      <Seo
        title={`${data.document &&
          `${data?.document?.title} | `}Mintter Publication`}
      />
      <PublicationModal document={data.document} />
    </Page>
  )
}

function usePublication() {
  // get document version
  const {slug} = useParams()
  const history = useHistory()
  const version = React.useMemo(() => slug.split('-').slice(-1)[0], [slug])
  const {data, isSuccess, ...document} = useDocument(version)
  // add slug to URL
  React.useEffect(() => {
    if (isSuccess && data.document) {
      const {title} = data.document
      if (title && !slug.includes('-')) {
        const titleSlug = slugify(title, {
          lower: true,
          remove: /[*+~.?()'"!:@]/g,
        })
        history.replace(`${titleSlug}-${version}`)
      }
    }
  }, [data])

  return {
    ...document,
    isSuccess,
    data,
    value:
      data && data.document
        ? toSlateTree({
            blockRefList: data.document.blockRefList,
            blocksMap: data?.blocksMap,
            isRoot: true,
          })
        : null,
  }
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
      <p className="text-gray-800 font-light text-sm pt-4 text-body">
        Document created via <strong className="font-bold">Mintter App.</strong>
      </p>
      <p className="text-gray-800 text-sm pt-4 font-light text-body">
        Mintter is a distributed publishing platform that brings to your content{' '}
        <strong className="font-bold">Ownership, Authorship, Atribution</strong>{' '}
        and <strong className="font-bold">Traceability.</strong>
      </p>
      <button
        className="mt-4 text-primary text-base font-bold flex items-center w-full justify-end group"
        onClick={handleInteract}
      >
        <span className="w-6 h-6 rounded-full bg-background-muted mr-2 text-primary flex items-center justify-center group-hover:bg-background-muted transform duration-200 ">
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
      <h3 className="font-bold text-2xl text-heading">
        Want to add your thougts to this subject?
      </h3>
      <p className="mt-4 text-body">
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

function PublicationHeader({document}: {document: Document.AsObject}) {
  const {data: author} = useAuthor(document?.author)
  return document ? (
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
        {document.title}
      </h1>
      {document.subtitle && (
        <p
          className={`text-md md:text-lg font-light text-heading-muted italic mt-4 leading-tight ${css`
            word-wrap: break-word;
            white-space: pre-wrap;
            min-height: 28px;
          `}`}
        >
          {document.subtitle}
        </p>
      )}
      <p className="text-sm mt-4 text-heading">
        <span>by </span>

        <AuthorLabel author={author} />
      </p>
    </div>
  ) : null
}

function fallbackCopyTextToClipboard(text) {
  const textArea = document.createElement('textarea')
  textArea.value = text

  // Avoid scrolling to bottom
  textArea.style.top = '0'
  textArea.style.left = '0'
  textArea.style.position = 'fixed'
  textArea.style.opacity = '0'

  document.body.appendChild(textArea)
  textArea.focus()
  textArea.select()
  let result

  try {
    const successful = document.execCommand('copy')
    const msg = successful ? 'successful' : 'unsuccessful'
    result = true
  } catch (err) {
    console.error('Fallback: Oops, unable to copy', err)
    result = false
  }

  document.body.removeChild(textArea)
  return result
}
function copyTextToClipboard(text) {
  if (!navigator.clipboard) {
    return fallbackCopyTextToClipboard(text)
  }
  return navigator.clipboard.writeText(text).then(
    () => {
      // console.log('Async: Copying to clipboard was successful!!')
      return true
    },
    err => {
      console.error('Async: Could not copy text: ', err)
      return false
    },
  )
}
