import {mainService as defaultMainService} from '@app/app-providers'
import {MINTTER_LINK_PREFIX} from '@app/constants'
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
    const down = (e) => {
      if (e.key === 'k' && e.metaKey) {
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
      <Command.Input value={search} onValueChange={setSearch} />
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

        <Command.Group heading="Drafts">
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
                {draft.title}
              </Command.Item>
            )
          })}
        </Command.Group>

        <Command.Group heading="Publications">
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
                {publication.document?.title}
              </Command.Item>
            )
          })}
        </Command.Group>
      </Command.List>
    </Command.Dialog>
  )
}

function isMintterLink(text: string) {
  return text.startsWith(MINTTER_LINK_PREFIX)
}
