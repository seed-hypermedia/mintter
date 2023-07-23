import {
  useDraftList,
  usePublicationList,
} from '@mintter/app/src/models/documents'
import {fetchWebLink} from '@mintter/app/src/models/web-links'
import {useNavigate} from '@mintter/app/src/utils/navigation'
import {getIdsfromUrl, isHyperdocsScheme} from '@mintter/shared'
import {Spinner} from '@mintter/ui'
import {useListen} from '@mintter/app'
import {Command} from 'cmdk'
import {useState} from 'react'
import {toast} from 'react-hot-toast'
import './quick-switcher.scss'
import {useAppContext} from '@mintter/app'

export default function QuickSwitcher() {
  const {data: drafts} = useDraftList()
  const {data: publications} = usePublicationList()

  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const navigate = useNavigate()

  // Toggle the menu when ⌘K is pressed
  useListen('open_quick_switcher', () => {
    if (document.hasFocus()) {
      // FIXME: this is a *hack* until we just send this event to the current window from tauri
      setOpen(true)
    }
  })
  const queryClient = useAppContext().queryClient
  const [actionPromise, setActionPromise] = useState<Promise<void> | null>(null)

  return (
    <Command.Dialog
      open={open}
      onOpenChange={(isOpen) => {
        setOpen(isOpen)
        if (!isOpen) setActionPromise(null)
      }}
      label="Quick Switcher"
    >
      <Command.Input
        value={search}
        onValueChange={setSearch}
        placeholder="Search Drafts and Publications..."
        disabled={!!actionPromise}
      />
      {actionPromise ? (
        <Spinner />
      ) : (
        <Command.List>
          <Command.Empty>No results found.</Command.Empty>
          {(isHyperdocsScheme(search) ||
            search.startsWith('http://') ||
            search.startsWith('https://')) && (
            <Command.Item
              key="mtt-link"
              value={search}
              onSelect={() => {
                let [docId, version, block] = getIdsfromUrl(search)
                if (docId && isHyperdocsScheme(search)) {
                  setOpen(false)
                  navigate({
                    key: 'publication',
                    documentId: docId,
                    versionId: version,
                    blockId: block,
                  })
                } else {
                  let [docId, version, block] = getIdsfromUrl(search)
                  if (docId) {
                    navigate({
                      key: 'publication',
                      documentId: docId,
                      versionId: version,
                      blockId: block,
                    })
                    setOpen(false)
                  } else {
                    console.log('HELLO111 ==========', queryClient, search)
                    setActionPromise(
                      fetchWebLink(queryClient, search)
                        .then((result) => {
                          if (result && result?.documentId) {
                            setOpen(false)
                            navigate({
                              key: 'publication',
                              documentId: result.documentId,
                              versionId: result.documentVersion,
                            })
                          }
                        })
                        .catch(() => {
                          toast.error('Failed to open link.')
                        })
                        .finally(() => {
                          setActionPromise(null)
                        }),
                    )
                  }
                }
              }}
            >
              Query {search}
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
                    draftId: draft.id,
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
      )}
    </Command.Dialog>
  )
}
