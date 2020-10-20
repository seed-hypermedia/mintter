import {
  ELEMENT_BLOCK_LIST,
  ELEMENT_READ_ONLY,
  Icons,
  toSlateTree,
} from '@mintter/editor'
import React from 'react'
import {useDocument} from 'shared/mintterContext'
import {useAuthor} from 'shared/profileContext'
import {AuthorLabel} from './author-label'
import {SlateReactPresentation} from 'slate-react-presentation'
import {ELEMENT_PARAGRAPH} from '@mintter/editor'
import {Link} from './link'

export function InteractionPanelObject(props) {
  const [version] = React.useState(() => props.id.split('/')[0])
  const [objectId] = React.useState(() => props.id.split('/')[1])
  const {status, data} = useDocument(version)
  const {data: author} = useAuthor(data?.document?.author)
  const [open, setOpen] = React.useState(true)

  if (status === 'success') {
    const {title, subtitle, blockRefList, version} = data.document

    const doc = toSlateTree({
      blockRefList,
      blocksMap: data.blocksMap,
      isRoot: true,
    })

    return (
      <div className="border rounded-lg m-4 break-words whitespace-pre-wrap relative bg-background">
        <div className="p-4">
          <div className="flex justify-between items-center text-muted-hover">
            <p className="text-muted-hover font-extrabold text-xs uppercase">
              Document
            </p>
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
          </div>
          <h2 className="font-bold text-2xl mt-2">{title}</h2>
          <AuthorLabel author={author} />
        </div>
        {open && (
          <div className="px-4 py-2 border-t">
            <ContentRenderer value={doc} />
          </div>
        )}
        <div className="border-t ">
          <Link to={`/p/${version}`}>
            <a className="flex items-center p-4 text-primary text-sm font-bold hover:bg-background-muted">
              <Icons.CornerDownLeft size={16} color="currentColor" />
              <span className="mx-2">Open in main panel</span>
            </a>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 border rounded m-4 break-words whitespace-pre-wrap">
      <p>loading...</p>
    </div>
  )
}

function ContentRenderer({value}) {
  const renderElement = React.useCallback(({attributes, children, element}) => {
    switch (element.type) {
      case ELEMENT_BLOCK_LIST:
        return (
          <div {...attributes} className="pl-4">
            {children}
          </div>
        )
      case ELEMENT_PARAGRAPH:
        return (
          <p {...attributes} className="py-1 text-body text-xl leading-loose">
            {children}
          </p>
        )
      default:
        return children
    }
  }, [])

  const renderLeaf = React.useCallback(({attributes, children, leaf}) => {
    if (leaf.bold) {
      children = <strong className="font-bold">{children}</strong>
    }

    return <span {...attributes}>{children}</span>
  }, [])

  return (
    <div contentEditable={false} className="mt-2">
      <SlateReactPresentation
        value={value}
        renderElement={renderElement}
        renderLeaf={renderLeaf}
      />
    </div>
  )
}
