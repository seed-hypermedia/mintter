import React, {useMemo, useEffect, useState} from 'react'
import {useLocation} from 'react-router-dom'
import Link from './link'
import {useProfile} from 'shared/profileContext'
import useLocalStorage from 'shared/localstorage'
import {ErrorMessage} from './errorMessage'

export default function DocumentList({data, status, error}) {
  const [view, setView] = useLocalStorage<'grid' | 'list'>({
    key: 'MINTTER_GRID_VIEW',
    initialValue: 'list',
  })

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
    content = data.map(item => <ListItem key={item.documentId} item={item} />)
  }

  return <div>{content}</div>
}

function ListItem({item}) {
  const location = useLocation()
  const [prefetched, setPrefetch] = React.useState<boolean>(false)
  const {title, description, author: itemAuthor} = item
  const theTitle = title ? title : 'Untitled Document'
  const theDescription = description
    ? description
    : 'Document with no description'

  const {getAuthor} = useProfile()

  const author = getAuthor(itemAuthor)

  const isDraft = useMemo(() => location.pathname === '/library/drafts', [
    location.pathname,
  ])

  const href = useMemo(
    () => (isDraft ? `/editor/${item.documentId}` : `/p/${item.id}`),
    [location.pathname],
  )
  function handlePrefetch() {
    if (!prefetched) {
      // TODO: prefetch on hover
      // console.log(`prefetch draft with id ${draft.documentId}`)
      setPrefetch(true)
    }
  }

  return (
    <Link href={href} className={`block w-full -m-2 first:mt-4`}>
      <div
        className={`bg-background-muted transition duration-200 hover:shadow-lg flex items-center justify-between`}
        onMouseEnter={handlePrefetch}
      >
        <h3 className={`text-heading font-bold truncate flex-1 p-4 `}>
          {theTitle}
        </h3>
        <p
          className={`text-body truncate p-4 flex-1 border-0 border-l border-muted`}
        >
          {theDescription}
        </p>
        {!isDraft && location.pathname !== '/library/my-publications' && (
          <p
            className={`text-sm text-heading inline-block p-4 border-0 border-l border-muted`}
          >
            <span>by </span>
            <span className="text-primary hover:text-primary-hover hover:underline hover:cursor-not-allowed truncate">
              {author}
            </span>
          </p>
        )}
      </div>
    </Link>
  )
}
