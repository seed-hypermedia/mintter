import React from 'react'
import {Icons} from '@mintter/editor'
import {useLocation, useRouteMatch, match as Match} from 'react-router-dom'
import Link from './link'
import {useAuthor} from 'shared/profileContext'
import {ErrorMessage} from './errorMessage'
import {Document} from '@mintter/api/v2/documents_pb'
import {getPath} from 'components/routes'
import {format} from 'date-fns'

interface Props {
  data: Document.AsObject[]
  isLoading: boolean
  isError: boolean
  error: any
  onDeleteDocument?: (id: string) => Promise<void>
}

interface ItemProps {
  item: any // TODO: fix types (Document.AsObject + Document)
  onDeleteDocument?: (version: string) => void
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
      {data.map(item => (
        <ListItem
          key={item.version}
          item={item}
          onDeleteDocument={onDeleteDocument}
        />
      ))}
    </div>
  )
}

function ListItem({item, onDeleteDocument}: ItemProps) {
  const match = useRouteMatch()
  const location = useLocation()
  // const [prefetched, setPrefetch] = React.useState<boolean>(false)
  const {version, title, subtitle, author: itemAuthor} = item
  const theTitle = title ? title : 'Untitled Document'

  const {data: author} = useAuthor(itemAuthor)

  const isDraft = React.useMemo(() => location.pathname.includes('drafts'), [
    location.pathname,
  ])

  const to = React.useMemo(() => {
    const path = `${getPath(match)}${isDraft ? '/editor' : '/p'}/${version}`
    return path
  }, [location.pathname])
  // function handlePrefetch() {
  // if (!prefetched) {
  // TODO: prefetch on hover
  // console.log(`prefetch draft with id ${draft.id}`)
  // setPrefetch(true)
  // }
  // }

  const date = React.useMemo(() => item.doc.getCreateTime().toDate(), [item])

  return (
    <Link
      to={to}
      className="bg-transparent group w-full p-4 -mx-4 mt-2 first:mt-4 hover:bg-background-muted transition duration-100 box-border flex flex-col"
      // onMouseEnter={handlePrefetch}
    >
      <div className="flex-1 grid grid-cols-12 gap-4">
        <div className={onDeleteDocument ? 'col-span-11' : 'col-span-12'}>
          {!isDraft && location.pathname !== '/library/my-publications' && (
            <div className="flex items-center">
              <div className="w-6 h-6 rounded-full bg-gray-400" />
              <p className="text-sm text-heading inline-block font-light mx-2">
                {author?.username}
              </p>
            </div>
          )}
          <h3 className="text-heading text-xl leading-5 font-bold truncate mt-2">
            {theTitle}
          </h3>
          {subtitle ? <p className="mt-2 font-serif">{subtitle}</p> : null}

          <p className="text-xs mt-2 text-heading font-light">
            {format(new Date(date), 'MMMM d, yyyy')}
          </p>
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
