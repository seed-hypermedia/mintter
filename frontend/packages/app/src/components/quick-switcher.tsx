import {useAppContext} from '@mintter/app/src/app-context'
import {
  useDraftList,
  usePublicationList,
} from '@mintter/app/src/models/documents'
import {fetchWebLink} from '@mintter/app/src/models/web-links'
import {unpackHmIdWithAppRoute} from '@mintter/app/src/utils/navigation'
import {useNavigate} from '@mintter/app/src/utils/useNavigate'
import {HYPERMEDIA_SCHEME, isHypermediaScheme} from '@mintter/shared'
import {Spinner, YStack} from '@mintter/ui'
import {Command} from 'cmdk'
import {useState} from 'react'
import {toast} from 'react-hot-toast'
import {useContactsList} from '../models/contacts'
import {useGroups} from '../models/groups'
import './quick-switcher.css'
import {useListenAppEvent} from '../utils/window-events'

export function QuickSwitcher() {
  const [open, setOpen] = useState(false)
  const {data: drafts} = useDraftList()
  const {data: publications} = usePublicationList({
    enabled: open,
    trustedOnly: false,
  })
  const {data: groups} = useGroups({
    enabled: open,
  })
  const {data: contacts} = useContactsList()
  const [search, setSearch] = useState('')
  const navigate = useNavigate()

  useListenAppEvent('openQuickSwitcher', () => {
    setOpen(true)
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
        <YStack padding="$6">
          <Spinner />
        </YStack>
      ) : (
        <Command.List>
          <Command.Empty>No results found.</Command.Empty>
          {(isHypermediaScheme(search) ||
            search.startsWith('http://') ||
            search.startsWith('https://')) && (
            <Command.Item
              key="mtt-link"
              value={search}
              onSelect={() => {
                const searched = unpackHmIdWithAppRoute(search)
                console.log('== ~ QuickSwitcher ~ searched', searched)
                if (
                  searched?.scheme === HYPERMEDIA_SCHEME ||
                  searched?.hostname === 'hyper.media'
                ) {
                  if (searched?.navRoute) {
                    setOpen(false)
                    navigate(searched?.navRoute)
                  } else {
                    console.log('== ~ QuickSwitcher ~ Querying Web URL', search)
                    setActionPromise(
                      fetchWebLink(queryClient, search)
                        .then((result) => {
                          console.log(
                            '🌐 Queried Web URL Result',
                            search,
                            result,
                          )
                          if (result && result?.documentId) {
                            setOpen(false)
                            navigate({
                              key: 'publication',
                              documentId: result.documentId,
                              versionId: result.documentVersion,
                            })
                          }
                        })
                        .catch((e) => {
                          console.error(
                            '🚨 Failed to fetch web link',
                            search,
                            e,
                          )
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
              Query{' '}
              {`${search.length > 28 ? search.substring(0, 25) : search}...`}
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

          {groups?.groups.map((group) => {
            return (
              <Command.Item
                key={group.id}
                value={group.title + group.id}
                onSelect={() => {
                  setOpen(false)
                  navigate({
                    key: 'group',
                    groupId: group.id,
                  })
                }}
              >
                <span className="cmdk-mtt-text">{group.title}</span>
                <span className="cmdk-mtt-type">Group</span>
              </Command.Item>
            )
          })}

          {contacts?.accounts.map((account) => {
            return (
              <Command.Item
                key={account.id}
                value={account.profile?.alias + account.id}
                onSelect={() => {
                  setOpen(false)
                  navigate({
                    key: 'account',
                    accountId: account.id,
                  })
                }}
              >
                <span className="cmdk-mtt-text">{account.profile?.alias}</span>
                <span className="cmdk-mtt-type">Account</span>
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
