import {toSlateTree} from '@mintter/editor'
import React from 'react'
import {useDocument} from 'shared/mintterContext'
import {useAuthor} from 'shared/profileContext'
import {AuthorLabel} from './author-label'
import {SlateReactPresentation} from 'slate-react-presentation'
import {ELEMENT_PARAGRAPH} from '@mintter/editor'

export function InteractionPanelObject(props) {
  const [version] = React.useState(() => props.id.split('/')[0])
  const [objectId] = React.useState(() => props.id.split('/')[1])
  const {status, data} = useDocument(version)
  const {data: author} = useAuthor(data?.document?.author)

  console.log('InteractionPanelObject -> data', data)
  if (status === 'success') {
    const {title, subtitle, blockRefList} = data.document

    const doc = toSlateTree({
      blockRefList,
      blocksMap: data.blocksMap,
      isRoot: true,
    })
    console.log('InteractionPanelObject -> doc', doc)

    return (
      <div className="p-4 border rounded m-4 break-words whitespace-pre-wrap relative">
        <p className="text-body-muted font-extrabold text-xs uppercase">
          Document
        </p>
        <h2 className="font-bold text-2xl">{title}</h2>
        <AuthorLabel author={author} />
        <ContentRenderer value={doc} />
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
      case ELEMENT_PARAGRAPH:
        return (
          <p
            {...attributes}
            className="px-2 py-1 text-body text-xl leading-loose"
          >
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
    <div contentEditable={false}>
      <SlateReactPresentation
        value={value}
        renderElement={renderElement}
        renderLeaf={renderLeaf}
      />
    </div>
  )
}
