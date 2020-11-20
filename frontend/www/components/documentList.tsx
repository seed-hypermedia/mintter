import React from 'react'
import {Icons} from '@mintter/editor'
import {useLocation, useRouteMatch, match as Match} from 'react-router-dom'
import Link from './link'
import {useAuthor} from 'shared/profileContext'
import {ErrorMessage} from './errorMessage'
import {AuthorLabel} from 'components/author-label'
import {Document} from '@mintter/api/v2/documents_pb'
import {getPath} from 'components/routes'

interface Props {
  data: Document.AsObject[]
  isLoading: boolean
  isError: boolean
  error: any
  onDeleteDocument?: (id: string) => Promise<void>
}

export default function DocumentList({
  data,
  isLoading,
  isError,
  error,
  onDeleteDocument,
}: Props) {
  if (isLoading) {
    return (
      <div className="flex items-center -mx-4 p-12 bg-background-muted rounded">
        <p>Loading...</p>
      </div>
    )
  }
  if (isError) {
    return <ErrorMessage error={error} />
  }

  return (
    <div>
      {data.map((item, index) => (
        <ListItem
          key={item.version}
          item={item}
          index={index}
          onDeleteDocument={onDeleteDocument}
        />
      ))}
    </div>
  )
}

interface ItemProps {
  item: Document.AsObject
  index: number
  onDeleteDocument?: (version: string) => void
}

function ListItem({item, index = 0, onDeleteDocument}: ItemProps) {
  const match = useRouteMatch()
  const location = useLocation()
  const [prefetched, setPrefetch] = React.useState<boolean>(false)
  const {version, title, author: itemAuthor, createTime} = item
  const theTitle = title ? title : 'Untitled Document'

  const {data: author} = useAuthor(itemAuthor)

  const isDraft = React.useMemo(() => location.pathname.includes('drafts'), [
    location.pathname,
  ])

  const to = React.useMemo(() => {
    const path = `${getPath(match)}${isDraft ? '/editor' : '/p'}/${version}`
    console.log('ListItem -> path', path)
    return path
  }, [location.pathname])
  function handlePrefetch() {
    if (!prefetched) {
      // TODO: prefetch on hover
      // console.log(`prefetch draft with id ${draft.id}`)
      setPrefetch(true)
    }
  }

  return (
    <Link
      to={to}
      className="bg-transparent group w-full p-4 mt-2 first:mt-4 hover:bg-background-muted transition duration-100 box-border flex"
      onMouseEnter={handlePrefetch}
    >
      <span className="text-heading font-light leading-loose flex-none pr-4">
        {index + 1}.
      </span>
      <div className=" flex-1 grid grid-cols-12 gap-4">
        <div className={onDeleteDocument ? 'col-span-11' : 'col-span-12'}>
          <h3 className="text-heading leading-loose font-bold truncate">
            {theTitle}
          </h3>
          <div className="flex items-center">
            {!isDraft && location.pathname !== '/library/my-publications' && (
              <p className="text-sm text-heading inline-block font-light">
                <AuthorLabel author={author} />
              </p>
            )}
            <p className="text-sm text-heading font-light">
              {createTime?.seconds}
            </p>
          </div>
        </div>
        {onDeleteDocument && (
          <div className="col-span-1 flex items-center justify-end">
            <button
              data-testid="delete-button"
              className="opacity-0 group-hover:opacity-100 text-danger"
              onClick={e => {
                e.preventDefault()
                const resp = window.confirm(
                  'are you sure you want to delete it?',
                )
                if (resp) {
                  onDeleteDocument(version)
                }
              }}
            >
              <Icons.Trash />
            </button>
          </div>
        )}
      </div>
    </Link>
  )
}
