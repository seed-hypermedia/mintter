import React from 'react'
import AppsOutlinedIcon from '@material-ui/icons/AppsOutlined'
import FormatListBulletedOutlinedIcon from '@material-ui/icons/FormatListBulletedOutlined'
import {queryCache} from 'react-query'
import Link from './link'
import {useFetchDraft} from '../shared/drafts'

export default function DocumentList({drafts, draftErrors}) {
  console.log('DocumentList -> drafts', drafts)
  const list = (drafts && drafts.results && drafts.results.draftsList) || []

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
        {list.map(draft => (
          <DraftListItem key={draft.documentId} draft={draft} />
        ))}
      </div>
    </div>
  )
}

function DraftListItem({draft}: any) {
  const {title, description} = draft

  const theTitle = title ? title : 'Untitled Draft'
  const theDescription = description ? description : 'Draft with no description'

  async function handlePrefetch() {
    // TODO: prefetch on hover
  }
  return (
    <Link href={`/app/editor?draftId=${draft.documentId}`}>
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
