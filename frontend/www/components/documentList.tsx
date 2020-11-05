import React from 'react'
import {Icons} from '@mintter/editor'
import {useLocation} from 'react-router-dom'
import Link from './link'
import {useAuthor} from 'shared/profileContext'
import {ErrorMessage} from './errorMessage'
import {AuthorLabel} from 'components/author-label'
import {Document} from '@mintter/api/v2/documents_pb'
import {QueryStatus} from 'react-query'

interface Props {
  data: Document.AsObject[]
  status: QueryStatus
  error: any
  onDraftDelete?: (id: string) => Promise<void>
}

export default function DocumentList({
  data,
  status,
  error,
  onDraftDelete,
}: Props) {
  let content

  if (status === 'loading') {
    content = (
      <div className="flex items-center -mx-4 p-12 bg-background-muted rounded">
        <p>Loading...</p>
      </div>
    )
  } else if (status === 'error') {
    content = <ErrorMessage error={error} />
  } else {
    content = data.map((item, index) => (
      <ListItem
        key={item.version}
        item={item}
        index={index}
        onDraftDelete={onDraftDelete}
      />
    ))
  }

  return <div>{content}</div>
}

interface ItemProps {
  item: Document.AsObject
  index: number
  onDraftDelete?: (version: string) => void
}

function ListItem({item, index = 0, onDraftDelete}: ItemProps) {
  const location = useLocation()
  const [prefetched, setPrefetch] = React.useState<boolean>(false)
  const {version, title, author: itemAuthor, createTime} = item
  const theTitle = title ? title : 'Untitled Document'

  const {data: author} = useAuthor(itemAuthor)

  const isDraft = React.useMemo(
    () => location.pathname === '/private/library/drafts',
    [location.pathname],
  )

  const to = React.useMemo(
    () => (isDraft ? `/private/editor/${version}` : `/p/${version}`),
    [location.pathname],
  )
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
        <div className="bg-muted rounded col-span-2"></div>
        <div className={onDraftDelete ? 'col-span-9' : 'col-span-10'}>
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
        {onDraftDelete && (
          <div className="col-span-1">
            <button
              className="opacity-0 group-hover:opacity-100 text-danger"
              onClick={e => {
                e.preventDefault()
                const resp = window.confirm(
                  'are you sure you want to delete it?',
                )
                if (resp) {
                  onDraftDelete(version)
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
