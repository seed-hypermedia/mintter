import {mainService as defaultMainService} from '@app/app-providers'
import {isMintterLink} from '@app/utils/is-mintter-link'
import {listen} from '@tauri-apps/api/event'
import {useActor} from '@xstate/react'
import {Command} from 'cmdk'
import {useEffect, useState} from 'react'
import {getIdsfromUrl} from '../utils/get-ids-from-url'

type QuickSwitcherProps = {
  mainService?: typeof defaultMainService
}

export function QuickSwitcher({
  mainService = defaultMainService,
}: QuickSwitcherProps) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')

  let [mainState] = useActor(mainService)
  const drafts = mainState.context.draftList
  const publications = mainState.context.publicationList

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
              const [docId, version, blockId] = getIdsfromUrl(search)

              mainService.send({
                type: 'GO.TO.PUBLICATION',
                docId,
                version,
                blockId,
              })

              setOpen(false)
            }}
          >
            Jump to {search}
          </Command.Item>
        )}

        {drafts.map((draft) => {
          return (
            <Command.Item
              key={draft.id}
              value={draft.title || 'Untitled Draft'}
              onSelect={() => {
                setOpen(false)

                mainService.send({
                  type: 'GO.TO.DRAFT',
                  docId: draft.id,
                })
              }}
            >
              <span cmdk-mtt-text="">{draft.title || 'Untitled Draft'}</span>
              <span cmdk-mtt-type="">Draft</span>
            </Command.Item>
          )
        })}

        {publications.map((publication) => {
          const docId = publication.document?.id
          const title = publication.document?.title || 'Untitled Publication'

          if (!docId || !title) return null

          return (
            <Command.Item
              key={docId}
              value={title}
              onSelect={() => {
                setOpen(false)

                mainService.send({
                  type: 'GO.TO.PUBLICATION',
                  docId,
                  version: publication.version,
                })
              }}
            >
              <span cmdk-mtt-text="">{publication.document?.title}</span>
              <span cmdk-mtt-type="">Publication</span>
            </Command.Item>
          )
        })}
      </Command.List>
    </Command.Dialog>
  )
}
