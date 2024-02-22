import {useAppContext} from '@mintter/app/app-context'
import {useDraftList, usePublicationList} from '@mintter/app/models/documents'
import {fetchWebLink} from '@mintter/app/models/web-links'
import {useNavigate} from '@mintter/app/utils/useNavigate'
import {trpc} from '@mintter/desktop/src/trpc'
import {
  Account,
  Document,
  GRPCClient,
  Group,
  HYPERMEDIA_SCHEME,
  Publication,
  extractBlockRefOfUrl,
  hmIdWithVersion,
  isHypermediaScheme,
} from '@mintter/shared'
import {
  Button,
  Input,
  ScrollView,
  SizableText,
  XStack,
  YStack,
  toast,
} from '@mintter/ui'
import {useEffect, useState} from 'react'
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
import {useAppDialog} from './dialog'

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

type SwitcherItem = {
  key: string
  title: string
  type?: string
  onSelect: () => void
}
function QuickSwitcherContent({
  input,
  onClose,
}: {
  input: {
    groups: Group[]
    accounts: Account[]
    publications: Publication[]
    drafts: Document[]
  }
  onClose: () => void
}) {
  const [search, setSearch] = useState('')
  const navigate = useNavigate()
  const grpcClient = useGRPCClient()
  const queryClient = useAppContext().queryClient
  const [actionPromise, setActionPromise] = useState<Promise<void> | null>(null)
  const gwHost = useGatewayHost()
  const handleUrl = useURLHandler()
  // const searchResults = useSearch(search, {})
  let queryItem: null | SwitcherItem = null
  if (
    isHypermediaScheme(search) ||
    search.startsWith('http://') ||
    search.startsWith('https://') ||
    search.includes('.')
  ) {
    queryItem = {
      key: 'mtt-link',
      title: search,
      onSelect: async () => {
        const searched = await resolveHmIdToAppRoute(search, grpcClient)
        if (
          (searched?.scheme === HYPERMEDIA_SCHEME ||
            searched?.hostname === gwHost) &&
          searched?.navRoute
        ) {
          onClose()
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
                  onClose()
                  navigate(navRoute)
                }
              })
              .catch((error) => {
                appError(`QuickSwitcher Error: ${error}`, {error})
              })
              .finally(() => {
                setActionPromise(null)
              }),
          )
        }
      },
    }
  }
  const allItems: SwitcherItem[] = [
    ...input.groups.map((group) => {
      return {
        key: group.id,
        title: group.title,
        type: 'Group',
        onSelect: () => {
          onClose()
          navigate({
            key: 'group',
            groupId: group.id,
          })
        },
      }
    }),
    ...input.accounts.map((account) => {
      return {
        key: account.id,
        title: account.profile?.alias || account.id,
        type: 'Account',
        onSelect: () => {
          onClose()
          navigate({
            key: 'account',
            accountId: account.id,
          })
        },
      }
    }),
    ...input.publications
      .map((publication) => {
        const docId = publication.document?.id
        const ownerId = publication.document?.author
        const title = publication.document?.title || 'Untitled Publication'

        if (!docId || !title || !ownerId) return null

        return {
          key: docId,
          title,
          type: 'Publication',
          onSelect: () => {
            onClose()
            navigate({
              key: 'publication',
              documentId: docId,
              variant: {key: 'authors', authors: [ownerId]},
              // versionId not included here, we will navigate to the latest version in the global context
            })
          },
        }
      })
      .filter((item) => item !== null),
    ...input.drafts.map((draft) => {
      return {
        key: `draft-${draft.id}`,
        title: draft.title || 'Untitled Document',
        type: 'Draft',
        onSelect: () => {
          onClose()
          navigate({
            key: 'draft',
            draftId: draft.id,
          })
        },
      }
    }),
  ]
  const filterItems = allItems.filter((item) => {
    return item.title.match(search.toLowerCase())
  })
  const [focusedIndex, setFocusedIndex] = useState(0)
  useEffect(() => {
    const keyPressHandler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
      if (e.nativeEvent.key === 'Enter') {
        const item = filterItems[focusedIndex]
        if (item) {
          item.onSelect()
        }
      }
      if (e.nativeEvent.key === 'ArrowDown') {
        setFocusedIndex((prev) => (prev + 1) % filterItems.length)
      }
      if (e.nativeEvent.key === 'ArrowUp') {
        setFocusedIndex(
          (prev) => (prev - 1 + filterItems.length) % filterItems.length,
        )
      }
    }
    window.addEventListener('keydown', keyPressHandler)
    return () => {
      window.removeEventListener('keydown', keyPressHandler)
    }
  }, [])
  return (
    <YStack>
      <Input
        autoFocus
        value={search}
        onChangeText={setSearch}
        placeholder="Query URL, Search Documents, Groups, Accounts..."
        disabled={!!actionPromise}
        onKeyPress={(e) => {
          if (e.nativeEvent.key === 'Escape') {
            onClose()
          }
          if (e.nativeEvent.key === 'Enter') {
            const item = filterItems[focusedIndex]
            if (item) {
              item.onSelect()
            }
          }
          if (e.nativeEvent.key === 'ArrowDown') {
            setFocusedIndex((prev) => (prev + 1) % filterItems.length)
          }
          if (e.nativeEvent.key === 'ArrowUp') {
            setFocusedIndex(
              (prev) => (prev - 1 + filterItems.length) % filterItems.length,
            )
          }
        }}
      />
      <ScrollView maxHeight={600}>
        <YStack gap="$2" marginVertical="$2">
          {filterItems.map((item, itemIndex) => {
            return (
              <Button
                key={item.key}
                onPress={item.onSelect}
                backgroundColor={
                  focusedIndex === itemIndex ? '$blue4' : undefined
                }
                onFocus={() => {
                  setFocusedIndex(itemIndex)
                }}
              >
                <XStack f={1} justifyContent="space-between">
                  <SizableText>{item.title}</SizableText>

                  <SizableText color="$color10">{item.type}</SizableText>
                </XStack>
              </Button>
            )
          })}
        </YStack>
      </ScrollView>
    </YStack>
  )
}

export function QuickSwitcher() {
  const quickSwitcher = useAppDialog(QuickSwitcherContent)
  const {data: drafts} = useDraftList()
  const {data: publications} = usePublicationList({
    enabled: true,
    trustedOnly: false,
  })
  const {data: groups} = useGroups({
    enabled: true,
  })
  const {data: contacts} = useContactsList()
  const allData = {
    contacts: contacts?.accounts || [],
    groups: groups?.groups || [],
    publications: publications?.publications || [],
    drafts: drafts?.documents || [],
    accounts: contacts?.accounts || [],
  }
  useListenAppEvent('openQuickSwitcher', () => {
    quickSwitcher.open(allData)
  })
  return quickSwitcher.content
}
