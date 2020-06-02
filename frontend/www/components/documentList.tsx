import React, {useMemo, useEffect, useState} from 'react'
import AppsOutlinedIcon from '@material-ui/icons/AppsOutlined'
import FormatListBulletedOutlinedIcon from '@material-ui/icons/FormatListBulletedOutlined'
import Link from './link'
import {useRouter} from 'next/router'
import {NavItem} from 'components/nav'
import {getProfile} from 'shared/mintterClient'
import {useMintter, useAuthor} from 'shared/mintterContext'

export default function DocumentList({data, status, error}) {
  const router = useRouter()
  if (status === 'loading') {
    return <p>Loading...</p>
  }

  if (status === 'error') {
    return <p>ERROR! == {error}</p>
  }

  return (
    <div>
      <div className="flex items-center -mx-4">
        <NavItem
          href="/library/publications"
          active={router.pathname === '/library/publications'}
        >
          Publications
        </NavItem>
        <NavItem
          href="/library/my-publications"
          active={router.pathname === '/library/my-publications'}
        >
          My Publications
        </NavItem>
        <NavItem
          href="/library/drafts"
          active={router.pathname === '/library/drafts'}
        >
          Drafts
        </NavItem>
        <div className="flex-1" />
        {/* <div className="mx-2">
          <button className="m-2">
            <AppsOutlinedIcon className="text-primary" />
          </button>
          <button className="m-2">
            <FormatListBulletedOutlinedIcon className="text-primary" />
          </button>
        </div> */}
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
  const router = useRouter()
  const [prefetched, setPrefetch] = React.useState<boolean>(false)
  const {title, description, author: itemAuthor} = item
  const theTitle = title ? title : 'Untitled Document'
  const theDescription = description
    ? description
    : 'Document with no description'

  const author = useAuthor(itemAuthor)

  const isDraft = useMemo(() => router.pathname === '/library/drafts', [
    router.pathname,
  ])

  const href = useMemo(
    () => (isDraft ? `/editor/${item.documentId}` : `/p/${item.id}`),
    [router.pathname],
  )
  function handlePrefetch() {
    if (!prefetched) {
      // TODO: prefetch on hover
      // console.log(`prefetch draft with id ${draft.documentId}`)
      setPrefetch(true)
    }
  }

  return (
    <Link href={href}>
      <div
        className="bg-background-muted p-6 rounded-lg mt-8 first:mt-0"
        onMouseEnter={handlePrefetch}
      >
        <h3 className="text-heading text-2xl font-bold">{theTitle}</h3>
        <p className="text-body mt-4">{theDescription}</p>
        {!isDraft && (
          <p className=" text-sm mt-4 text-heading">
            <span>by </span>
            <span className="text-primary hover:text-primary-hover hover:underline hover:cursor-not-allowed">
              {author}
            </span>
          </p>
        )}
      </div>
    </Link>
  )
}
