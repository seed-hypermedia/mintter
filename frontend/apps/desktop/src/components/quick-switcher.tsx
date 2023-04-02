import {useDraftList, usePublicationList} from '@app/hooks'
import {isMintterLink} from '@app/utils/is-mintter-link'
import {useNavigate} from '@app/utils/navigation'
import {getIdsfromUrl} from '@mintter/shared'
import {listen} from '@tauri-apps/api/event'
import {Command} from 'cmdk'
import {useEffect, useState} from 'react'
import '../styles/quick-switcher.scss'

export default function QuickSwitcher() {
  const {data: drafts} = useDraftList()
  const {data: publications} = usePublicationList()

  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const navigate = useNavigate()

  // Toggle the menu when ⌘K is pressed
  useEffect(() => {
    let unlisten: () => void | undefined

    listen('open_quick_switcher', () => {
      if (document.hasFocus()) {
        // FIXME: this is a *hack* until we just send this event to the current window from tauri
        setOpen(true)
      }
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
              navigate({
                key: 'publication',
                documentId: docId,
                versionId: version,
                blockId: block,
              })
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
                navigate({
                  key: 'draft',
                  documentId: draft.id,
                })
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
                navigate({
                  key: 'publication',
                  documentId: docId,
                  versionId: publication.version,
                })
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
