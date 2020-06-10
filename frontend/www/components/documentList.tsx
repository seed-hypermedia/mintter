import React, {useMemo, useEffect, useState} from 'react'
import {useLocation} from 'react-router-dom'
import Link from './link'
import {useProfile} from 'shared/profileContext'
import useLocalStorage from 'shared/localstorage'
import {ErrorMessage} from './errorMessage'
import {AuthorLabel} from 'components/author-label'

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
    content = data.map((item, index) => (
      <ListItem key={item.documentId} item={item} index={index} />
    ))
  }

  return <div>{content}</div>
}

function ListItem({item, index = 0}) {
  const location = useLocation()
  const [prefetched, setPrefetch] = React.useState<boolean>(false)
  const {title, description, author: itemAuthor, createTime, ...rest} = item

  const theTitle = title ? title : 'Untitled Document'

  const {getAuthor} = useProfile()

  const author = getAuthor(itemAuthor)

  const isDraft = useMemo(() => location.pathname === '/library/drafts', [
    location.pathname,
  ])

  const to = useMemo(
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

  console.log('createTime => ', rest)

  return (
    <Link
      to={to}
      className="bg-transparent block w-full first:mt-4 flex p-4 mt-2 first:mt-0 hover:bg-background-muted transition duration-100"
      onMouseEnter={handlePrefetch}
    >
      <span className="text-heading font-light leading-loose">
        {index + 1}.
      </span>
      <div className="bg-muted rounded w-20 flex-none ml-4"></div>
      <div className="flex-1 pl-4 w-full">
        <h3 className="text-heading w-full font-bold truncate leading-loose">
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
    </Link>
  )
}
