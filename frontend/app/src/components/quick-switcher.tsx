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
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.ctrlKey || e.metaKey)) {
        setOpen((open) => !open)
      }
    }

    let unlisten: () => void | undefined
    listen('open_quick_switcher', () => {
      setOpen(true)
    }).then((f) => (unlisten = f))

    document.addEventListener('keydown', down)
    return () => {
      document.removeEventListener('keydown', down)
      unlisten?.()
    }
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
              value={draft.title}
              onSelect={() => {
                setOpen(false)

                mainService.send({
                  type: 'GO.TO.DRAFT',
                  docId: draft.id,
                })
              }}
            >
              <span cmdk-mtt-text="">{draft.title}</span>
              <span cmdk-mtt-type="">Draft</span>
            </Command.Item>
          )
        })}

        {publications.map((publication) => {
          return (
            <Command.Item
              key={publication.document!.id}
              value={publication.document!.title}
              onSelect={() => {
                setOpen(false)

                mainService.send({
                  type: 'GO.TO.PUBLICATION',
                  docId: publication.document!.id,
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
