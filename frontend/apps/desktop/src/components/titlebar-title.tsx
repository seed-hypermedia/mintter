import {useSizeObserver} from '@/components/app-embeds'
import {useDraftTitle} from '@/models/documents'
import {useEntitiesContent, useEntityRoutes} from '@/models/entities'
import {useNavRoute} from '@/utils/navigation'
import {AccountRoute, DocumentRoute, DraftRoute, NavRoute} from '@/utils/routes'
import {useNavigate} from '@/utils/useNavigate'
import {
  Button,
  ButtonText,
  Contact,
  FontSizeTokens,
  Home,
  Popover,
  TitleText,
  XStack,
  YStack,
  styled,
} from '@shm/ui'
import {Sparkles, Star} from '@tamagui/lucide-icons'
import {useEffect, useMemo, useRef, useState} from 'react'
import {AiOutlineEllipsis} from 'react-icons/ai'
import {getItemDetails} from './sidebar-neo'

export function TitleContent({size = '$4'}: {size?: FontSizeTokens}) {
  const route = useNavRoute()

  useEffect(() => {
    async function getTitleOfRoute(route: NavRoute): Promise<string> {
      if (route.key === 'contacts') return 'Contacts'
      return ''
    }
    getTitleOfRoute(route).then((title) => {
      // we set the window title so the window manager knows the title in the Window menu
      // @ts-ignore
      window.document.title = title
      // window.windowInfo.setTitle(title)
    })
  }, [route])

  if (route.key === 'feed') {
    return (
      <>
        <Home size={12} />
        <TitleText size={size} fontWeight="bold" data-testid="titlebar-title">
          Home Feed
        </TitleText>
      </>
    )
  }
  if (route.key === 'contacts') {
    return (
      <>
        <Contact size={12} />
        <TitleText data-testid="titlebar-title" size={size}>
          Contacts
        </TitleText>
      </>
    )
  }
  if (route.key === 'explore') {
    return (
      <>
        <Sparkles size={12} />
        <TitleText size={size}>Explore</TitleText>
      </>
    )
  }
  if (route.key === 'favorites') {
    return (
      <>
        <Star size={12} />
        <TitleText size={size}>Favorites</TitleText>
      </>
    )
  }

  if (route.key === 'account' || route.key === 'document') {
    return <BreadcrumbTitle route={route} />
  }
  if (route.key === 'draft') {
    return (
      <>
        <DraftTitle route={route} />
      </>
    )
  }
  return null
}

type CrumbDetails = {
  title?: string
  route: NavRoute
  crumbKey: string
}

function BreadcrumbTitle({route}: {route: DocumentRoute | AccountRoute}) {
  const entityRoutes = useEntityRoutes(route)
  const entityContents = useEntitiesContent(entityRoutes)
  const [collapsedCount, setCollapsedCount] = useState(0)
  const widthInfo = useRef({} as Record<string, number>)
  const entityRoutesDetails = useMemo(
    () =>
      entityRoutes.map((route) => {
        if (route.key === 'draft') return null // draft should not appear in context
        const details = getItemDetails(
          entityContents?.find((c) => c.route === route)?.entity,
          route.blockId,
        )
        return details
      }),
    [entityRoutes, entityContents],
  )
  const crumbDetails: (CrumbDetails | null)[] = useMemo(
    () =>
      entityRoutes.flatMap((route, routeIndex) => {
        const details = entityRoutesDetails[routeIndex]
        if (!details) return null
        return [
          {
            title: details.title,
            route: {
              ...route,
              blockId: undefined,
              isBlockFocused: undefined,
              context: [...entityRoutes.slice(0, routeIndex)],
            },
            crumbKey: `r-${routeIndex}`,
          },
          ...(details.headings
            ?.filter((heading) => !!heading.text && !heading.embedId)
            .map((heading, headingIndex) => {
              return {
                title: heading.text,
                route: {
                  ...route,
                  blockId: heading.id,
                  isBlockFocused: true,
                },
                crumbKey: `r-${routeIndex}-${headingIndex}`,
              }
            }) || []),
        ]
      }),

    [entityRoutes, entityContents],
  )

  function updateWidths() {
    const containerWidth = widthInfo.current.container
    const spacerWidth = 15
    const ellipsisWidth = 20
    const firstCrumbKey = crumbDetails[0]?.crumbKey
    const lastCrumbKey = crumbDetails.at(-1)?.crumbKey
    if (!firstCrumbKey || !lastCrumbKey || lastCrumbKey === firstCrumbKey)
      return
    const firstItemWidth = widthInfo.current[firstCrumbKey]
    const lastItemWidth = widthInfo.current[lastCrumbKey]
    const fixedItemWidth = firstItemWidth + lastItemWidth + spacerWidth
    const crumbWidths: number[] = crumbDetails.map((details) => {
      return (details && widthInfo.current[details.crumbKey]) || 0
    })
    const desiredWidth = crumbWidths.slice(1, -1).reduce((acc, w) => {
      if (!w) return acc
      return acc + w + spacerWidth
    }, 0)
    let usableWidth = desiredWidth
    const maxCollapseCount = crumbDetails.length - 2
    let newCollapseCount = 0
    while (
      usableWidth +
        fixedItemWidth +
        (newCollapseCount ? spacerWidth + ellipsisWidth : 0) >
        containerWidth &&
      newCollapseCount < maxCollapseCount
    ) {
      usableWidth -= crumbWidths[1 + newCollapseCount] + spacerWidth
      newCollapseCount++
    }
    setCollapsedCount(newCollapseCount)
  }

  const containerObserverRef = useSizeObserver(({width}) => {
    widthInfo.current.container = width
    updateWidths()
  })
  const activeItem = crumbDetails[crumbDetails.length - 1]
  const firstInactiveDetail =
    crumbDetails[0] === activeItem ? null : crumbDetails[0]
  if (!activeItem) return null
  const firstItem = firstInactiveDetail ? (
    <BreadcrumbItem
      details={firstInactiveDetail}
      key={firstInactiveDetail.crumbKey}
      onSize={({width}: DOMRect) => {
        if (width) {
          widthInfo.current[firstInactiveDetail.crumbKey] = width
          updateWidths()
        }
      }}
    />
  ) : null

  const remainderItems = crumbDetails
    .slice(collapsedCount + 1, -1)
    .map((details) => {
      if (!details) return null
      return (
        <BreadcrumbItem
          key={details.crumbKey}
          details={details}
          onSize={({width}: DOMRect) => {
            if (width) {
              widthInfo.current[details.crumbKey] = width
              updateWidths()
            }
          }}
        />
      )
    })
  const displayItems = [firstItem]
  if (collapsedCount) {
    displayItems.push(
      <BreadcrumbEllipsis
        crumbDetails={crumbDetails}
        collapsedCount={collapsedCount}
      />,
    )
  }
  displayItems.push(...remainderItems)
  displayItems.push(
    <BreadcrumbItem
      details={activeItem}
      key={activeItem.crumbKey}
      isActive
      onSize={({width}: DOMRect) => {
        if (width) {
          widthInfo.current[activeItem.crumbKey] = width
          updateWidths()
        }
      }}
    />,
  )
  return (
    <XStack
      f={1}
      marginRight={'$4'}
      height={20}
      overflow="hidden"
      ref={containerObserverRef}
    >
      <XStack position="absolute" gap="$2" f={1} marginRight={'$4'}>
        {displayItems.map((item, itemIndex) => {
          if (!item) return null
          return (
            <>
              {item}
              {itemIndex < displayItems.length - 1 ? (
                <BreadcrumbSeparator />
              ) : null}
            </>
          )
        })}
      </XStack>
    </XStack>
  )
}

function BreadcrumbEllipsis({
  crumbDetails,
  collapsedCount,
}: {
  crumbDetails: (CrumbDetails | null)[]
  collapsedCount: number
}) {
  const navigate = useNavigate()
  return (
    <Popover>
      <Popover.Trigger className="no-window-drag">
        <Button
          size="$1"
          icon={AiOutlineEllipsis}
          chromeless
          backgroundColor="$colorTransparent"
        ></Button>
      </Popover.Trigger>
      <Popover.Content bg="$backgroundStrong">
        <Popover.Arrow borderWidth={1} borderColor="$borderColor" />
        <YStack space="$3">
          {crumbDetails.slice(1, 1 + collapsedCount).map((crumb) => {
            if (!crumb) return null
            return (
              <TitleTextButton
                onPress={() => {
                  navigate(crumb.route)
                }}
              >
                {crumb?.title}
              </TitleTextButton>
            )
          })}
        </YStack>
      </Popover.Content>
    </Popover>
  )
}

function BreadcrumbSeparator() {
  return (
    <TitleText size="$4" color="$color10">
      {' / '}
    </TitleText>
  )
}

function BreadcrumbItem({
  details,
  isActive,
  onSize,
}: {
  details: CrumbDetails
  isActive?: boolean
  onSize: (rect: DOMRect) => void
}) {
  const navigate = useNavigate()
  const observerRef = useSizeObserver(onSize)
  if (!details?.title) return null
  if (isActive) {
    return (
      <TitleText ref={observerRef} fontWeight="bold">
        {details.title}
      </TitleText>
    )
  }
  return (
    <TitleTextButton
      ref={observerRef}
      className="no-window-drag"
      onPress={() => {
        navigate(details.route)
      }}
      fontWeight={isActive ? 'bold' : 'normal'}
    >
      {details.title}
    </TitleTextButton>
  )
}

export const TitleTextButton = styled(ButtonText, {
  whiteSpace: 'nowrap',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  name: 'TitlebarLink',
  color: '$color12',
  fontSize: '$4',
  userSelect: 'none',
  padding: 0,
  margin: 0,
  textTransform: 'none',
  cursor: 'pointer',
  hoverStyle: {
    textDecorationLine: 'underline',
  },
})

export function Title({size}: {size?: FontSizeTokens}) {
  return (
    <XStack
      gap="$2"
      alignItems="flex-start"
      marginVertical={0}
      paddingHorizontal="$4"
      justifyContent="flex-start"
      ai="center"
      width="100%"
    >
      <TitleContent size={size} />
    </XStack>
  )
}

function DraftTitle({
  route,
  size = '$4',
}: {
  route: DraftRoute
  size?: FontSizeTokens
}) {
  const title = useDraftTitle({
    documentId: route.draftId,
  })

  const realTitle = title ?? 'Untitled Document'
  // const fixedTitle = useFixedDraftTitle(route)
  // TODO: check wtf is this
  const fixedTitle = undefined
  const displayTitle = fixedTitle || realTitle
  useWindowTitle(displayTitle ? `Draft: ${displayTitle}` : undefined)
  return (
    <>
      <TitleText data-testid="titlebar-title" size={size}>
        {displayTitle}
      </TitleText>
    </>
  )
}

function useWindowTitle(title?: string) {
  useEffect(() => {
    if (title) {
      window.document.title = title
    }
  }, [title])
}
