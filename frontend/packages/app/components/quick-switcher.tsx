import {useAppContext} from '@mintter/app/app-context'
import {useDraftList, usePublicationList} from '@mintter/app/models/documents'
import {fetchWebLink} from '@mintter/app/models/web-links'
import {useNavigate} from '@mintter/app/utils/useNavigate'
import {trpc} from '@mintter/desktop/src/trpc'
import {
  GRPCClient,
  HYPERMEDIA_SCHEME,
  extractBlockRefOfUrl,
  getDocumentTitle,
  hmIdWithVersion,
  isHypermediaScheme,
} from '@mintter/shared'
import {Spinner, YStack, toast} from '@mintter/ui'
import {Command} from 'cmdk'
import {useState} from 'react'
import {useGRPCClient} from '../app-context'
import appError from '../errors'
import {useConnectPeer, useContactsList} from '../models/contacts'
import {useGatewayHost} from '../models/gateway-settings'
import {useGroups} from '../models/groups'
import {importWebCapture} from '../models/web-importer'
import {AppQueryClient} from '../query-client'
import {
  isHttpUrl,
  resolveHmIdToAppRoute,
  useHmIdToAppRouteResolver,
} from '../utils/navigation'
import {NavRoute} from '../utils/routes'
import {useListenAppEvent} from '../utils/window-events'
import './quick-switcher.css'

function useURLHandler() {
  const experiments = trpc.experiments.get.useQuery()
  const webQuery = trpc.webQuery.useMutation()
  const connect = useConnectPeer({
    onSuccess: () => {
      // toast.success('Connection Added')
    },
    onError: (err) => {
      console.error('Peer Connect Error:', err)
      // toast.error('Connection Error : ' + err?.rawMessage)
    },
  })
  const resolveHmUrl = useHmIdToAppRouteResolver()
  return async (
    queryClient: AppQueryClient,
    grpcClient: GRPCClient,
    search: string,
  ): Promise<NavRoute | null> => {
    const httpSearch = isHttpUrl(search) ? search : `https://${search}`

    connect.mutate(httpSearch)
    if (experiments.data?.webImporting) {
      const webResult = await webQuery.mutateAsync({webUrl: httpSearch})
      if (webResult.hypermedia) {
        const unpacked = await resolveHmUrl(webResult.hypermedia.url)
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
      const ownerId = imported.published.document?.author
      if (!documentId)
        throw new Error('Conversion succeeded but documentId is not here')
      if (!ownerId)
        throw new Error('Conversion succeeded but ownerId is not here')
      return {
        key: 'publication',
        documentId,
        variants: [
          {
            key: 'author',
            author: ownerId,
          },
        ],
      }
    } else {
      const result = await fetchWebLink(queryClient, httpSearch)
      const blockRef = extractBlockRefOfUrl(httpSearch)
      const fullHmId = hmIdWithVersion(
        result?.hmUrl || result?.hmId,
        result?.hmVersion,
        blockRef,
      )
      if (!fullHmId) throw new Error('Failed to fetch web link')
      const queried = await resolveHmUrl(fullHmId)
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
  const gwHost = useGatewayHost()
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
        placeholder="Query URL, Search Documents, Groups, Accounts..."
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
            search.startsWith('https://') ||
            search.includes('.')) && (
            <Command.Item
              key="mtt-link"
              value={search}
              onSelect={async () => {
                const searched = await resolveHmIdToAppRoute(search, grpcClient)
                if (
                  (searched?.scheme === HYPERMEDIA_SCHEME ||
                    searched?.hostname === gwHost) &&
                  searched?.navRoute
                ) {
                  setOpen(false)
                  navigate(searched?.navRoute)
                } else if (
                  search.startsWith('http://') ||
                  search.startsWith('https://') ||
                  search.includes('.')
                ) {
                  setActionPromise(
                    handleUrl(queryClient, grpcClient, search)
                      .then((navRoute) => {
                        if (navRoute) {
                          setOpen(false)
                          navigate(navRoute)
                        }
                      })
                      .catch((error) => {
                        appError(`QwickSwitcher Error: ${error}`, {error})
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
                value={getDocumentTitle(draft) + draft.id}
                onSelect={() => {
                  setOpen(false)
                  navigate({
                    key: 'draft',
                    draftId: draft.id,
                  })
                }}
              >
                <span className="cmdk-mtt-text">{getDocumentTitle(draft)}</span>
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
            const ownerId = publication.document?.author
            const title = publication.document?.title || 'Untitled Publication'

            if (!docId || !title || !ownerId) return null

            return (
              <Command.Item
                key={docId}
                value={title + docId}
                onSelect={() => {
                  setOpen(false)
                  navigate({
                    key: 'publication',
                    documentId: docId,
                    variant: {key: 'authors', authors: [ownerId]},
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
