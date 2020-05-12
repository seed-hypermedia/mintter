import React from 'react'
import AppsOutlinedIcon from '@material-ui/icons/AppsOutlined'
import FormatListBulletedOutlinedIcon from '@material-ui/icons/FormatListBulletedOutlined'
import {PaginatedQueryResult} from 'react-query'
import Link from './link'
import {ListDraftsResponse, Draft} from '@mintter/proto/documents_pb'

export default function DocumentList({
  data,
}: {
  data: PaginatedQueryResult<ListDraftsResponse>
}) {
  if (data.status === 'loading') {
    return <p>Loading...</p>
  }

  if (data.status === 'error') {
    return <p>ERROR! == {data.error}</p>
  }

  const draftsList = data.resolvedData.toObject().draftsList

  return (
    <div>
      <div className="flex items-center">
        <h2 className="text-2xl text-heading text-heading font-normal flex-1">
          My Drafts
        </h2>
        <div>
          <button>
            <AppsOutlinedIcon className="text-primary" />
          </button>
          <button>
            <FormatListBulletedOutlinedIcon className="text-primary" />
          </button>
        </div>
      </div>
      <div>
        {draftsList.map(draft => (
          <DraftListItem key={draft.documentId} draft={draft} />
        ))}
      </div>
    </div>
  )
}

function DraftListItem({draft}: {draft: Draft.AsObject}) {
  const [prefetched, setPrefetch] = React.useState<boolean>(false)
  const {title, description} = draft

  const theTitle = title ? title : 'Untitled Draft'
  const theDescription = description ? description : 'Draft with no description'

  function handlePrefetch() {
    if (!prefetched) {
      // TODO: prefetch on hover
      console.log(`prefetch draft with id ${draft.documentId}`)
      setPrefetch(true)
    }
  }
  return (
    <Link href={`/app/editor/${draft.documentId}`}>
      <div
        className="bg-gray-200 p-4 rounded mt-8 first:mt-0"
        onMouseEnter={handlePrefetch}
      >
        <h3>{theTitle}</h3>
        <p>{theDescription}</p>
      </div>
    </Link>
  )
}
