import {useAppContext} from '@mintter/app/app-context'
import {useDraftList, usePublicationList} from '@mintter/app/models/documents'
import {fetchWebLink} from '@mintter/app/models/web-links'
import {unpackHmIdWithAppRoute} from '@mintter/app/utils/navigation'
import {useNavigate} from '@mintter/app/utils/useNavigate'
import {
  GRPCClient,
  HYPERMEDIA_SCHEME,
  extractBlockRefOfUrl,
  hmIdWithVersion,
  isHypermediaScheme,
} from '@mintter/shared'
import {Spinner, YStack} from '@mintter/ui'
import {Command} from 'cmdk'
import {useState} from 'react'
import {toast} from 'react-hot-toast'
import {useContactsList} from '../models/contacts'
import {useGroups} from '../models/groups'
import './quick-switcher.css'
import {useListenAppEvent} from '../utils/window-events'
import {trpc} from '@mintter/desktop/src/trpc'
import {importWebCapture} from '../models/web-importer'
import {useGRPCClient} from '../app-context'
import {AppQueryClient} from '../query-client'
import {NavRoute} from '../utils/navigation'

function useURLHandler() {
  const experiments = trpc.experiments.get.useQuery()
  const webQuery = trpc.webQuery.useMutation()
  return async (
    queryClient: AppQueryClient,
    grpcClient: GRPCClient,
    search: string,
  ): Promise<NavRoute | null> => {
    if (experiments.data?.webImporting) {
      const webResult = await webQuery.mutateAsync({webUrl: search})
      if (webResult.hypermedia) {
        const unpacked = unpackHmIdWithAppRoute(
          `${webResult.hypermedia.id}?v=${webResult.hypermedia.version}`,
        )
        if (unpacked?.navRoute) return unpacked.navRoute
        console.log(
          'Failed to open this hypermedia content',
          webResult.hypermedia,
        )
        toast.error('Failed to open this hypermedia content')
        return null
      }
      toast('Importing from the web')
      const imported = await importWebCapture(webResult, grpcClient)
      const documentId = imported.published.document?.id
      if (!documentId)
        throw new Error('Conversion succeeded but documentId is not here')
      return {
        key: 'publication',
        documentId,
      }
    } else {
      const result = await fetchWebLink(queryClient, search)
      console.log('🌐 Queried Web URL Result', search, result)
      const blockRef = extractBlockRefOfUrl(search)
      const fullHmId = hmIdWithVersion(
        result?.hmId,
        result?.hmVersion,
        blockRef,
      )
      if (!fullHmId) throw new Error('Failed to fetch web link')
      const queried =
        result?.hmId == null ? null : unpackHmIdWithAppRoute(fullHmId)
      if (queried?.navRoute) {
        return queried?.navRoute
      }
    }
    throw new Error('Failed to fetch web link')
  }
}

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

  const grpcClient = useGRPCClient()
  const queryClient = useAppContext().queryClient
  const [actionPromise, setActionPromise] = useState<Promise<void> | null>(null)

  const handleUrl = useURLHandler()

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
                if (
                  (searched?.scheme === HYPERMEDIA_SCHEME ||
                    searched?.hostname === 'hyper.media') &&
                  searched?.navRoute
                ) {
                  setOpen(false)
                  navigate(searched?.navRoute)
                } else if (
                  search.startsWith('http://') ||
                  search.startsWith('https://')
                ) {
                  console.log('== ~ QuickSwitcher ~ Querying Web URL', search)
                  setActionPromise(
                    handleUrl(queryClient, grpcClient, search)
                      .then((navRoute) => {
                        if (navRoute) {
                          setOpen(false)
                          navigate(navRoute)
                        }
                      })
                      .catch((e) => {
                        console.error('🚨 Failed to fetch web link', search, e)
                        toast.error('Failed to open link.')
                      })
                      .finally(() => {
                        setActionPromise(null)
                      }),
                  )
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
                value={(draft.title || 'Untitled Document') + draft.id}
                onSelect={() => {
                  setOpen(false)
                  navigate({
                    key: 'draft',
                    draftId: draft.id,
                  })
                }}
              >
                <span className="cmdk-mtt-text">
                  {draft.title || 'Untitled Document'}
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
                    // versionId not included here, we will navigate to the latest version in the global context
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
