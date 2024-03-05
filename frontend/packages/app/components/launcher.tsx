import {useAppContext} from '@mintter/app/app-context'
import {fetchWebLink} from '@mintter/app/models/web-links'
import {useNavigate} from '@mintter/app/utils/useNavigate'
import {trpc} from '@mintter/desktop/src/trpc'
import {
  GRPCClient,
  HYPERMEDIA_ENTITY_TYPES,
  HYPERMEDIA_SCHEME,
  extractBlockRefOfUrl,
  hmIdWithVersion,
  isHypermediaScheme,
  unpackHmId,
} from '@mintter/shared'
import {
  Button,
  Input,
  ScrollView,
  SizableText,
  Spinner,
  XStack,
  YStack,
  toast,
} from '@mintter/ui'
import {useEffect, useLayoutEffect, useRef, useState} from 'react'
import {useGRPCClient} from '../app-context'
import appError from '../errors'
import {useConnectPeer} from '../models/contacts'
import {useGatewayHost} from '../models/gateway-settings'
import {useRecents} from '../models/recents'
import {useSearch} from '../models/search'
import {importWebCapture} from '../models/web-importer'
import {AppQueryClient} from '../query-client'
import {
  appRouteOfId,
  isHttpUrl,
  resolveHmIdToAppRoute,
  useHmIdToAppRouteResolver,
} from '../utils/navigation'
import {NavRoute} from '../utils/routes'
import {useListenAppEvent} from '../utils/window-events'
import {dialogBoxShadow, useAppDialog} from './dialog'

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
      console.log('web result', result)
      const blockRef = extractBlockRefOfUrl(httpSearch)
      const fullHmId = hmIdWithVersion(
        result?.hmId,
        result?.hmVersion,
        blockRef,
      )
      console.log('fullHmId', fullHmId)
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
  subtitle?: string
  onSelect: () => void
}
function LauncherContent({onClose}: {input: {}; onClose: () => void}) {
  const [search, setSearch] = useState('')
  const navigate = useNavigate()
  const grpcClient = useGRPCClient()
  const queryClient = useAppContext().queryClient
  const [actionPromise, setActionPromise] = useState<Promise<void> | null>(null)
  const gwHost = useGatewayHost()
  const handleUrl = useURLHandler()
  const recents = useRecents()
  const searchResults = useSearch(search, {})
  let queryItem: null | SwitcherItem = null
  if (
    isHypermediaScheme(search) ||
    search.startsWith('http://') ||
    search.startsWith('https://') ||
    search.includes('.')
  ) {
    queryItem = {
      key: 'mtt-link',
      title: `Query ${search}`,
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
                appError(`Launcher Error: ${error}`, {error})
              })
              .finally(() => {
                setActionPromise(null)
              }),
          )
        }
      },
    }
  }

  const searchItems: SwitcherItem[] =
    searchResults.data
      ?.map((item) => {
        const id = unpackHmId(item.id)
        if (!id) return null
        return {
          title: item.title || item.id,
          onSelect: () => {
            const appRoute = appRouteOfId(id)
            if (!appRoute) {
              toast.error('Failed to open recent: ' + item.id)
              return
            }
            navigate(appRoute)
            item.id
          },
          subtitle: HYPERMEDIA_ENTITY_TYPES[id.type],
        }
      })
      .filter(Boolean) || []
  const recentItems =
    recents.data?.map(({url, title, subtitle, type, variants}) => {
      return {
        key: url,
        title,
        subtitle,
        onSelect: () => {
          const id = unpackHmId(url)
          if (!id) {
            toast.error('Failed to open recent: ' + url)
            return
          }
          const openId = id.type === 'd' ? {...id, variants} : id
          const appRoute = appRouteOfId(openId)
          if (!appRoute) {
            toast.error('Failed to open recent: ' + url)
            return
          }
          navigate(appRoute)
        },
      }
    }) || []
  const isDisplayingRecents = !search.length
  const activeItems = isDisplayingRecents
    ? recentItems
    : [...(queryItem ? [queryItem] : []), ...searchItems]

  const [focusedIndex, setFocusedIndex] = useState(0)

  useEffect(() => {
    if (focusedIndex >= activeItems.length) setFocusedIndex(0)
  }, [focusedIndex, activeItems])

  useEffect(() => {
    const keyPressHandler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
      if (e.key === 'Enter') {
        const item = activeItems[focusedIndex]
        if (item) {
          item.onSelect()
        }
      }
      if (e.key === 'ArrowDown') {
        setFocusedIndex((prev) => (prev + 1) % activeItems.length)
      }
      if (e.key === 'ArrowUp') {
        setFocusedIndex(
          (prev) => (prev - 1 + activeItems.length) % activeItems.length,
        )
      }
    }
    window.addEventListener('keydown', keyPressHandler)
    return () => {
      window.removeEventListener('keydown', keyPressHandler)
    }
  }, [])
  let content = (
    <ScrollView>
      <YStack
        gap="$2"
        paddingVertical="$3"
        paddingHorizontal="$3"
        backgroundColor={'$background'}
        borderTopStartRadius={0}
        borderTopEndRadius={0}
        borderBottomLeftRadius={6}
        borderBottomRightRadius={6}
      >
        {isDisplayingRecents ? (
          <SizableText color="$color10" marginHorizontal="$4">
            Recent Resources
          </SizableText>
        ) : null}
        {activeItems?.map((item, itemIndex) => {
          return (
            <LauncherItem
              item={item}
              key={item.key}
              selected={focusedIndex === itemIndex}
              onFocus={() => {
                setFocusedIndex(itemIndex)
              }}
              onMouseEnter={() => {
                setFocusedIndex(itemIndex)
              }}
            />
          )
        })}
      </YStack>
    </ScrollView>
  )

  if (actionPromise) {
    content = (
      <YStack marginVertical="$4">
        <Spinner />
      </YStack>
    )
  }
  return (
    <YStack height="80%">
      <YStack
        backgroundColor="$background"
        borderBottomEndRadius={0}
        borderBottomStartRadius={0}
        borderTopRightRadius={6}
        borderTopLeftRadius={6}
        // @ts-expect-error tamagui confused about boxShadow I guess
        boxShadow={dialogBoxShadow}
        padding="$3"
        paddingBottom={0}
      >
        <Input
          autoFocus
          minHeight={42}
          value={search}
          onChangeText={setSearch}
          placeholder="Query URL, Search Documents, Groups, Accounts..."
          disabled={!!actionPromise}
          onKeyPress={(e) => {
            if (e.nativeEvent.key === 'Escape') {
              onClose()
            }
            if (e.nativeEvent.key === 'Enter') {
              const item = activeItems[focusedIndex]
              if (item) {
                item.onSelect()
              }
            }
            if (e.nativeEvent.key === 'ArrowDown') {
              e.preventDefault()
              setFocusedIndex((prev) => (prev + 1) % activeItems.length)
            }
            if (e.nativeEvent.key === 'ArrowUp') {
              e.preventDefault()
              setFocusedIndex(
                (prev) => (prev - 1 + activeItems.length) % activeItems.length,
              )
            }
          }}
        />
      </YStack>

      {content}
    </YStack>
  )
}

export function LauncherItem({item, selected = false, onFocus, onMouseEnter}) {
  const elm = useRef<HTMLDivElement>(null)

  useLayoutEffect(() => {
    if (selected) {
      elm.current?.scrollIntoView({block: 'nearest'})
    }
  }, [selected])

  return (
    <Button
      ref={elm}
      key={item.key}
      onPress={item.onSelect}
      backgroundColor={selected ? '$blue4' : undefined}
      hoverStyle={{
        backgroundColor: selected ? '$blue4' : undefined,
      }}
      onFocus={onFocus}
      onMouseEnter={onMouseEnter}
    >
      <XStack f={1} justifyContent="space-between">
        <SizableText numberOfLines={1}>{item.title}</SizableText>

        <SizableText color="$color10">{item.subtitle}</SizableText>
      </XStack>
    </Button>
  )
}

export function Launcher() {
  const launcher = useAppDialog(LauncherContent, {
    contentProps: {
      backgroundColor: '$colorTransparent',
      padding: 0,
      // @ts-expect-error tamagui confused about boxShadow I guess
      boxShadow: 'none',
      height: '75%',
    },
  })
  useListenAppEvent('openLauncher', () => {
    launcher.open({})
  })
  return launcher.content
}
