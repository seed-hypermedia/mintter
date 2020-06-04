import React, {useMemo, useEffect, useState} from 'react'
import AppsOutlinedIcon from '@material-ui/icons/AppsOutlined'
import FormatListBulletedOutlinedIcon from '@material-ui/icons/FormatListBulletedOutlined'
import Link from './link'
import {useRouter} from 'next/router'
import {NavItem} from 'components/nav'
import {useProfile} from 'shared/profileContext'
import useLocalStorage from 'shared/localstorage'
import {ErrorMessage} from './errorMessage'

export default function DocumentList({data, status, error}) {
  const [view, setView] = useLocalStorage<'grid' | 'list'>({
    key: 'MINTTER_GRID_VIEW',
    initialValue: 'list',
  })

  const isGrid = useMemo(() => view === 'grid', [view])
  const router = useRouter()

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
    content = data.map(item => (
      <ListItem key={item.documentId} isGrid={isGrid} item={item} />
    ))
  }

  return (
    <>
      <div className="flex items-center -mx-2">
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
        <div className="ml-4 mr-6">
          <button
            className={`m-2 p-1 rounded transition duration-100 ${
              isGrid ? 'bg-info' : 'bg-transparent hover:bg-background-muted'
            }`}
            onClick={() => setView('grid')}
          >
            <AppsOutlinedIcon
              className={isGrid ? 'text-white' : 'text-body-muted'}
            />
          </button>
          <button
            className={`m-2 p-1 rounded transition duration-100 ${
              isGrid ? 'bg-transparent hover:bg-background-muted' : 'bg-info'
            }`}
            onClick={() => setView('list')}
          >
            <FormatListBulletedOutlinedIcon
              className={isGrid ? 'text-body-muted' : 'text-white'}
            />
          </button>
        </div>
      </div>
      <div
        className={
          isGrid ? 'grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3' : ''
        }
      >
        {content}
      </div>
    </>
  )
}

function ListItem({item, isGrid = false}) {
  const router = useRouter()
  const [prefetched, setPrefetch] = React.useState<boolean>(false)
  const {title, description, author: itemAuthor} = item
  const theTitle = title ? title : 'Untitled Document'
  const theDescription = description
    ? description
    : 'Document with no description'

  const {getAuthor} = useProfile()

  const author = getAuthor(itemAuthor)

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
    <Link
      href={href}
      className={`block w-full -m-2 ${isGrid ? 'mt-4' : 'first:mt-4'}`}
    >
      <div
        className={`bg-background-muted transition duration-200 hover:shadow-lg ${
          isGrid ? 'p-6 rounded-lg' : 'flex items-center justify-between'
        }`}
        onMouseEnter={handlePrefetch}
      >
        <h3
          className={`text-heading font-bold truncate ${
            isGrid ? 'text-2xl' : 'flex-1 p-4'
          }`}
        >
          {theTitle}
        </h3>
        <p
          className={`text-body truncate ${
            isGrid ? 'mt-4' : 'p-4 flex-1 border-0 border-l border-muted'
          }`}
        >
          {theDescription}
        </p>
        {!isDraft && router.pathname !== '/library/my-publications' && (
          <p
            className={`text-sm text-heading inline-block ${
              isGrid
                ? 'mt-4 truncate overflow-hidden'
                : 'p-4 border-0 border-l border-muted'
            }`}
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
