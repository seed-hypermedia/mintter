import {
  ELEMENT_BLOCK,
  ELEMENT_BLOCK_LIST,
  ELEMENT_READ_ONLY,
  ELEMENT_TRANSCLUSION,
  Icons,
  toSlateTree,
} from '@mintter/editor'
import React from 'react'
import {useDocument} from 'shared/mintterContext'
import {useAuthor, useProfile} from 'shared/profileContext'
import {AuthorLabel} from './author-label'
import {SlateReactPresentation} from 'slate-react-presentation'
import {ELEMENT_PARAGRAPH} from '@mintter/editor'
import {Link} from './link'
import {ReactEditor, useSlate} from 'slate-react'
import Tippy from '@tippyjs/react'
import {css} from 'emotion'
import {useParams} from 'react-router-dom'
import {useTransclusion} from 'shared/useTransclusion'
import {queryCache} from 'react-query'
import {useInteractionPanel} from './interactionPanel'
import {isLocalhost} from './isLocalhost'

export function InteractionPanelObject(props) {
  const {version: draftVersion} = useParams()
  const [version] = React.useState(props.id.split('/')[0])
  // const [objectId] = React.useState(props.id.split('/')[1])
  const {status, data} = version
    ? useDocument(version)
    : {
        status: 'success',
        data: {
          document: {
            id: props.id,
            title: 'wrong reference',
            subtitle: null,
            author: null,
            version: null,
            parent: null,
            publishingState: null,
            blockRefList: null,
          },
        },
      }
  const {data: author} = useAuthor(data?.document?.author)
  const [open, setOpen] = React.useState(true)
  const {dispatch} = useInteractionPanel()
  const {data: user, isSuccess: isProfileSuccess} = useProfile()
  const isLocal = isLocalhost(window.location.hostname)
  const isAuthor = React.useMemo(() => {
    return user.accountId === data?.document?.author
  }, [user, data])

  async function onTransclude(block) {
    const updatedDraft = await props.createTransclusion({
      source: version,
      destination: draftVersion,
      block,
    })
    queryCache.refetchQueries(['Document', updatedDraft])
  }

  if (status === 'success') {
    const {id, title, subtitle, blockRefList, version} = data.document

    const doc = toSlateTree({
      blockRefList,
      blocksMap: data.blocksMap,
      isRoot: true,
    })

    return (
      <div className="border border-muted rounded-lg m-4 break-words whitespace-pre-wrap relative bg-background">
        <div className="p-4">
          <div className="flex justify-between items-center text-muted-hover">
            <p className="text-muted-hover font-extrabold text-xs uppercase">
              Document
            </p>
            <div>
              <button
                onClick={() => setOpen(val => !val)}
                className="rounded hover:bg-muted p-1 hover:text-body-muted transition duration-100"
              >
                {open ? (
                  <Icons.ChevronUp size={16} color="currentColor" />
                ) : (
                  <Icons.ChevronDown size={16} color="currentColor" />
                )}
              </button>
              <button
                onClick={() =>
                  dispatch({type: 'remove_object', payload: props.id})
                }
                className="rounded hover:bg-muted p-1 hover:text-body-muted transition duration-100"
              >
                <Icons.X size={16} color="currentColor" />
              </button>
            </div>
          </div>
          <h2 className="font-bold text-2xl mt-2">{title}</h2>
          <AuthorLabel author={author} />
        </div>
        {open && (
          <div className="px-4 py-2 border-t">
            <ContentRenderer
              isEditor={props.isEditor}
              value={doc}
              onTransclude={onTransclude}
            />
          </div>
        )}
        {!isLocal || (isProfileSuccess && isAuthor) ? (
          <ObjectFooter version={version} />
        ) : null}
      </div>
    )
  }

  return (
    <div className="p-4 border rounded m-4 break-words whitespace-pre-wrap">
      <p>loading...</p>
    </div>
  )
}

function ObjectFooter({version}) {
  return (
    <div className="border-t">
      <Link to={`/p/${version}`}>
        <a className="flex items-center p-4 text-primary text-sm font-bold hover:bg-background-muted">
          <Icons.CornerDownLeft size={16} color="currentColor" />
          <span className="mx-2">Open in main panel</span>
        </a>
      </Link>
    </div>
  )
}

function ContentRenderer({value, isEditor = false, onTransclude}) {
  const renderElement = React.useCallback(({children, ...props}) => {
    switch (props.element.type) {
      case ELEMENT_BLOCK:
        return (
          <IPWrapper isEditor={isEditor} onTransclude={onTransclude} {...props}>
            {children}
          </IPWrapper>
        )
      case ELEMENT_TRANSCLUSION:
        return (
          <IPWrapper isEditor={isEditor} onTransclude={onTransclude} {...props}>
            {children}
          </IPWrapper>
        )
      case ELEMENT_READ_ONLY:
        return (
          <div
            className="bg-background-muted -mx-2 px-2 rounded mt-1"
            {...props}
          >
            {children}
          </div>
        )
      case ELEMENT_PARAGRAPH:
        return <p {...props}>{children}</p>
      default:
        return children
    }
  }, [])

  const renderLeaf = React.useCallback(({attributes, children, leaf}) => {
    if (leaf.bold) {
      children = <strong>{children}</strong>
    }

    return <span {...attributes}>{children}</span>
  }, [])

  return (
    <div
      contentEditable={false}
      className="mt-2 prose xs:prose-xl lg:prose-2xl 2xl:prose-3xl"
    >
      <SlateReactPresentation
        value={value}
        renderElement={renderElement}
        renderLeaf={renderLeaf}
      />
    </div>
  )
}

function IPWrapper({attributes, children, element, isEditor, onTransclude}) {
  return (
    <div className="flex items-start relative" {...attributes}>
      {isEditor && (
        <Tippy
          delay={400}
          content={
            <span
              className={`px-2 py-1 text-xs font-light transition duration-200 rounded bg-muted-hover ${css`
                background-color: #333;
                color: #ccc;
              `}`}
            >
              Transclude to current document
            </span>
          }
        >
          <button
            className={`text-xs text-body-muted p-1 rounded-sm hover:bg-muted transition duration-100 mt-3 mr-2`}
            onClick={() => onTransclude(element)}
          >
            <Icons.CornerDownLeft size={12} color="currentColor" />
          </button>
        </Tippy>
      )}
      <div className={!isEditor ? 'pl-4' : ''}>{children}</div>
    </div>
  )
}
