import React from 'react'
import AppsOutlinedIcon from '@material-ui/icons/AppsOutlined'
import FormatListBulletedOutlinedIcon from '@material-ui/icons/FormatListBulletedOutlined'
import {PaginatedQueryResult} from 'react-query'
import Link from './link'
import {
  ListDraftsResponse,
  Draft,
  ListPublicationsResponse,
} from '@mintter/proto/documents_pb'

export default function DocumentList({data, status, error}) {
  if (status === 'loading') {
    return <p>Loading...</p>
  }

  if (status === 'error') {
    return <p>ERROR! == {error}</p>
  }

  return (
    <div>
      <div className="flex items-center -mx-4">
        <Link href="/drafts">
          <h2 className="text-2xl text-heading text-heading font-bold flex-1">
            Drafts
          </h2>
        </Link>
        <Link href="/publications">
          <h2 className="text-2xl text-heading text-heading font-bold flex-1">
            Publications
          </h2>
        </Link>
        <div className="flex-1" />
        <div className="mx-2">
          <button className="m-2">
            <AppsOutlinedIcon className="text-primary" />
          </button>
          <button className="m-2">
            <FormatListBulletedOutlinedIcon className="text-primary" />
          </button>
        </div>
      </div>
      <div>
        {data.map(item => (
          <ListItem key={item.documentId} item={item} />
        ))}
      </div>
    </div>
  )
}

function ListItem({item}) {
  const [prefetched, setPrefetch] = React.useState<boolean>(false)
  const {title, description} = item

  const theTitle = title ? title : 'Untitled Draft'
  const theDescription = description ? description : 'Draft with no description'

  function handlePrefetch() {
    if (!prefetched) {
      // TODO: prefetch on hover
      // console.log(`prefetch draft with id ${draft.documentId}`)
      setPrefetch(true)
    }
  }
  return (
    <Link href={`/editor/${item.documentId}`}>
      <div
        className="bg-background-muted p-4 rounded-lg mt-8 first:mt-0"
        onMouseEnter={handlePrefetch}
      >
        <h3 className="text-heading text-3xl font-bold">{theTitle}</h3>
        <p className="text-body">{theDescription}</p>
      </div>
    </Link>
  )
}
