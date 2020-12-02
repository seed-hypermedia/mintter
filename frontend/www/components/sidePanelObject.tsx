import {
  ELEMENT_BLOCK,
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
import Tippy from '@tippyjs/react'
import {css} from 'emotion'
import {useParams} from 'react-router-dom'
import {queryCache} from 'react-query'
import {useSidePanel} from './sidePanel'
import {isLocalhost} from 'shared/isLocalhost'
import {ErrorMessage} from './errorMessage'

export function SidePanelObject(props) {
  const {version: draftVersion} = useParams()
  const [version] = React.useState(props.id.split('/')[0])
  // const [objectId] = React.useState(props.id.split('/')[1])
  const {isLoading, isError, error, data} = useDocument(version)

  const {data: author} = useAuthor(data?.document?.author)
  const [open, setOpen] = React.useState(true)
  const {dispatch} = useSidePanel()
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

  if (isLoading) {
    return (
      <li className="p-4 border rounded m-4 break-words whitespace-pre-wrap">
        <p>loading...</p>
      </li>
    )
  }

  if (isError) {
    return (
      <li>
        <ErrorMessage error={error} />
      </li>
    )
  }

  const {title, blockRefList} = data.document

  const doc = toSlateTree({
    blockRefList,
    blocksMap: data.blocksMap,
    isRoot: true,
  })

  return (
    <li
      aria-label="document card"
      className="border border-muted rounded-lg m-4 break-words whitespace-pre-wrap relative bg-white"
    >
      <div className="p-4">
        <div className="flex justify-between items-center text-muted-hover">
          <p className="text-muted-hover text-xs uppercase">Document</p>
          <div>
            <button
              onClick={() => setOpen(val => !val)}
              className="rounded hover:bg-background-muted p-1 hover:text-body-muted transition duration-100"
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
              className="rounded hover:bg-background-muted p-1 hover:text-body-muted transition duration-100"
            >
              <Icons.X size={16} color="currentColor" />
            </button>
          </div>
        </div>
        <h2 className="font-bold mt-2">{title}</h2>

        <AuthorLabel author={author} className="text-sm" />
      </div>
      {open && (
        <div className=" pb-2 border-t">
          <ContentRenderer
            isEditor={props.isEditor}
            value={doc}
            onTransclude={onTransclude}
          />
        </div>
      )}
      {isLocal || (isProfileSuccess && isAuthor) ? (
        <ObjectFooter version={version} />
      ) : null}
    </li>
  )
}

function ObjectFooter({version}) {
  return (
    <div className="border-t">
      <Link
        to={`/p/${version}`}
        className="flex items-center p-4 text-primary text-sm font-bold hover:bg-background-muted"
      >
        <Icons.CornerDownLeft size={16} color="currentColor" />
        <span className="mx-2">Open in main panel</span>
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
          <div className="bg-background -mx-2 px-2 rounded mt-1" {...props}>
            {children}
          </div>
        )
      case ELEMENT_PARAGRAPH:
        return (
          <p {...props} style={{margin: 0}}>
            {children}
          </p>
        )
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
    <div contentEditable={false} className="prose prose-lg">
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
    <div
      {...attributes}
      className={`flex items-start relative px-4 pt-4 ${
        !isEditor ? 'pl-0' : ''
      }`}
    >
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
          <p style={{margin: 0}}>
            <button
              className={`text-body-muted p-1 rounded-sm hover:bg-background-muted transition duration-100 mr-2`}
              onClick={() => onTransclude(element)}
            >
              <Icons.CornerDownLeft size={12} color="currentColor" />
            </button>
          </p>
        </Tippy>
      )}
      <div className={`${!isEditor ? 'pl-4' : ''} w-full`}>{children}</div>
    </div>
  )
}
