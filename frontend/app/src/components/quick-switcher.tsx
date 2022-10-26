import {useDraftList, usePublicationList} from '@app/hooks'
import {isMintterLink} from '@app/utils/is-mintter-link'
import {useLocation} from '@components/router'
import {listen} from '@tauri-apps/api/event'
import {Command} from 'cmdk'
import {useEffect, useState} from 'react'
import '../styles/quick-switcher.scss'
import {getIdsfromUrl} from '../utils/get-ids-from-url'

export default function QuickSwitcher() {
  const {data: drafts} = useDraftList()
  const {data: publications} = usePublicationList()

  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  let [, setLocation] = useLocation()

  // Toggle the menu when ⌘K is pressed
  useEffect(() => {
    let unlisten: () => void | undefined

    listen('open_quick_switcher', () => {
      setOpen(true)
    }).then((f) => (unlisten = f))

    return () => unlisten?.()
  }, [])

  return (
    <Command.Dialog open={open} onOpenChange={setOpen} label="Quick Switcher">
      <Command.Input
        value={search}
        onValueChange={setSearch}
        placeholder="Search Drafts and Publications..."
      />
      <Command.List>
        <Command.Empty>No results found.</Command.Empty>

        {isMintterLink(search) && (
          <Command.Item
            key="mtt-link"
            value={search}
            onSelect={() => {
              setOpen(false)
              let [docId, version, block] = getIdsfromUrl(search)
              setLocation(`/p/${docId}/${version}/${block && `/${block}`}`)
            }}
          >
            Jump to {search}
          </Command.Item>
        )}

        {drafts?.documents.map((draft) => {
          return (
            <Command.Item
              key={draft.id}
              value={(draft.title || 'Untitled Draft') + draft.id}
              onSelect={() => {
                setOpen(false)

                setLocation(`/d/${draft.id}`)
              }}
            >
              <span className="cmdk-mtt-text">
                {draft.title || 'Untitled Draft'}
              </span>
              <span className="cmdk-mtt-type">Draft</span>
            </Command.Item>
          )
        })}

        {publications?.publications.map((publication) => {
          const docId = publication.document?.id
          const title = publication.document?.title || 'Untitled Publication'

          if (!docId || !title) return null

          return (
            <Command.Item
              key={docId}
              value={title + docId}
              onSelect={() => {
                setOpen(false)
                setLocation(`/p/${docId}/${publication.version}`)
              }}
            >
              <span className="cmdk-mtt-text">
                {publication.document?.title}
              </span>
              <span className="cmdk-mtt-type">Publication</span>
            </Command.Item>
          )
        })}
      </Command.List>
    </Command.Dialog>
  )
}
