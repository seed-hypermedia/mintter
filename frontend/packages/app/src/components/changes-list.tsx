import {TimelineChange, useEntityTimeline} from '@mintter/app/models/changes'
import {useAccount} from '@mintter/app/src/models/accounts'
import {useNavigate} from '@mintter/app/src/utils/useNavigate'
import {
  Change,
  createPublicWebHmUrl,
  formattedDate,
  formattedDateMedium,
  pluralS,
  unpackHmId,
} from '@mintter/shared'
import {UnpackedHypermediaId} from '@mintter/shared/src/utils/entity-id-url'
import {
  Avatar,
  Button,
  ButtonText,
  Copy,
  ExternalLink,
  PanelCard,
  SizableText,
  XStack,
  YStack,
} from '@mintter/ui'
import {useMemo} from 'react'
import {
  NavRoute,
  unpackHmIdWithAppRoute,
  useNavRoute,
} from '../utils/navigation'
import {AccessoryContainer} from './accessory-sidebar'
import {AccountLinkAvatar} from './account-link-avatar'
import {getAvatarUrl} from '../utils/account-url'
import {OptionsDropdown} from './list-item'
import {copyTextToClipboard} from '../copy-to-clipboard'

type ComputedChangeset = {
  activeVersionChanges: TimelineChange[]
  prevVersions: TimelineChange[]
  nextVersionChanges: TimelineChange[]
}

function ChangeItem({
  change,
  prevListedChange,
  entityId,
  activeVersion,
}: {
  change: Change
  prevListedChange?: TimelineChange
  entityId: string
  activeVersion?: string
}) {
  const author = useAccount(change.author)
  const navigate = useNavigate()
  const openAccount = () => {
    navigate({key: 'account', accountId: change.author})
  }
  const navRoute = useNavRoute()
  const isActive = activeVersion === change.id
  const shouldDisplayAuthorName =
    !prevListedChange || change.author !== prevListedChange.change.author
  const changeTimeText = (
    <SizableText
      size="$2"
      textAlign="left"
      fontWeight={isActive ? 'bold' : 'normal'}
    >
      {change.createTime ? formattedDateMedium(change.createTime) : null}
    </SizableText>
  )
  const topRow = shouldDisplayAuthorName ? (
    <XStack>
      <Button
        size="$2"
        alignItems="center"
        justifyContent="flex-start"
        chromeless
        onPress={openAccount}
        icon={<AccountLinkAvatar accountId={author?.data?.id} size={20} />}
      >
        {author?.data?.profile?.alias || change.author}
      </Button>
    </XStack>
  ) : (
    <XStack paddingLeft={35}>{changeTimeText}</XStack>
  )
  const dateRow = shouldDisplayAuthorName ? changeTimeText : null
  let destRoute: NavRoute | null = null
  if (navRoute.key === 'group') {
    destRoute = {
      key: 'group',
      groupId: entityId,
      version: change.id,
      accessory: {key: 'versions'},
    }
  } else if (navRoute.key === 'publication') {
    destRoute = {
      key: 'publication',
      documentId: entityId,
      versionId: change.id,
      pubContext: navRoute.pubContext,
      accessory: {key: 'versions'},
    }
  }
  const parsedEntityId = unpackHmId(entityId)
  const publicWebUrl =
    parsedEntityId &&
    createPublicWebHmUrl('d', parsedEntityId?.eid, {
      version: change.id,
    })
  const spawn = useNavigate('spawn')
  return (
    <XStack
      marginTop={shouldDisplayAuthorName ? '$4' : undefined}
      ai="center"
      gap="$2"
    >
      <YStack
        f={1}
        overflow="hidden"
        borderRadius="$2"
        backgroundColor={isActive ? '$backgroundHover' : 'transparent'}
        hoverStyle={{
          cursor: 'pointer',
          backgroundColor: isActive ? '$green4' : '$backgroundHover',
        }}
        onPress={() => {
          destRoute && navigate(destRoute)
        }}
        disabled={!destRoute}
        paddingHorizontal="$4"
        position="relative"
      >
        {topRow}

        {dateRow && (
          <XStack gap="$2">
            <XStack width={28} />
            {dateRow}
          </XStack>
        )}
      </YStack>
      <OptionsDropdown
        menuItems={[
          {
            key: 'copyLink',
            icon: Copy,
            onPress: () => {
              if (!publicWebUrl) return
              copyTextToClipboard(publicWebUrl)
            },
            label: 'Copy Link to Version',
          },
          {
            key: 'openNewWindow',
            icon: ExternalLink,
            onPress: () => {
              const dest = unpackHmIdWithAppRoute(publicWebUrl)
              if (!dest?.navRoute) return
              spawn(dest.navRoute)
            },
            label: 'Open in New Window',
          },
        ]}
      />
    </XStack>
  )
}

function PrevVersions({
  changeset: {prevVersions},
  id,
  activeVersion,
}: {
  changeset: ComputedChangeset
  id: UnpackedHypermediaId
  activeVersion: string
}) {
  if (!prevVersions.length) return null
  return (
    <>
      <XStack paddingHorizontal="$4" paddingVertical="$3">
        <SizableText>Previous Versions</SizableText>
      </XStack>
      <YStack
        paddingHorizontal="$4"
        paddingBottom="$6"
        borderBottomColor="$borderColor"
        borderBottomWidth={1}
      >
        {prevVersions.map((item, index) => {
          return (
            <ChangeItem
              prevListedChange={prevVersions[index - 1]}
              entityId={id.id}
              key={item.change.id}
              change={item.change}
              activeVersion={activeVersion}
            />
          )
        })}
      </YStack>
    </>
  )
}

function ActiveVersions({
  changeset: {activeVersionChanges, nextVersionChanges, prevVersions},
  id,
  activeVersion,
}: {
  changeset: ComputedChangeset
  id: UnpackedHypermediaId
  activeVersion: string
}) {
  let subheading = prevVersions.length === 0 ? 'Original Version' : null
  if (!subheading) {
    subheading =
      activeVersionChanges.length > 1 ? 'Selected Versions' : 'Selected Version'
  }
  return (
    <>
      <XStack paddingHorizontal="$4" paddingVertical="$3">
        <SizableText>{subheading}</SizableText>
      </XStack>
      <YStack
        paddingHorizontal="$4"
        paddingBottom="$6"
        borderBottomColor="$borderColor"
        borderBottomWidth={1}
      >
        {activeVersionChanges.map((item, index) => {
          return (
            <ChangeItem
              prevListedChange={activeVersionChanges[index - 1]}
              entityId={id.id}
              key={item.change.id}
              change={item.change}
              activeVersion={activeVersion}
            />
          )
        })}
      </YStack>
    </>
  )
}

function NextVersions({
  changeset: {nextVersionChanges},
  id,
  activeVersion,
}: {
  changeset: ComputedChangeset
  id: UnpackedHypermediaId
  activeVersion: string
}) {
  if (!nextVersionChanges.length) return null
  return (
    <>
      <XStack paddingHorizontal="$4" paddingVertical="$3">
        <SizableText>
          {pluralS(nextVersionChanges.length, 'Next Version')}
        </SizableText>
      </XStack>
      <YStack
        paddingHorizontal="$4"
        paddingBottom="$6"
        borderBottomColor="$borderColor"
        borderBottomWidth={1}
      >
        {nextVersionChanges.map((item, index) => {
          return (
            <ChangeItem
              prevListedChange={nextVersionChanges[index - 1]}
              entityId={id.id}
              key={item.change.id}
              change={item.change}
              activeVersion={activeVersion}
            />
          )
        })}
      </YStack>
    </>
  )
}

export function EntityVersionsAccessory({
  id,
  activeVersion,
}: {
  id?: UnpackedHypermediaId | null
  activeVersion: string
}) {
  const {data} = useEntityTimeline(id?.id)
  const computed = useMemo(() => {
    const activeVersionChanges: TimelineChange[] = []
    activeVersion
      ?.split('.')
      .map((chId) => data?.allChanges[chId])
      .forEach((ch) => ch && activeVersionChanges.push(ch))
    const prevVersions: TimelineChange[] = []
    let walkLeafVersions = activeVersionChanges
    while (walkLeafVersions?.length) {
      const nextLeafVersions: TimelineChange[] = []
      for (const change of walkLeafVersions) {
        change?.change.deps?.map((depChangeId) => {
          const depChange = data?.allChanges[depChangeId]
          if (depChange) {
            prevVersions.push(depChange)
            nextLeafVersions.push(depChange)
          }
        })
      }
      walkLeafVersions = nextLeafVersions
    }
    const nextVersionChangeIds = new Set<string>()
    activeVersionChanges.forEach((ch) =>
      ch.citations.forEach((citingId) => nextVersionChangeIds.add(citingId)),
    )
    const nextVersionChanges = [...nextVersionChangeIds]
      .map((changeId) => data?.allChanges[changeId])
      .filter(Boolean) as TimelineChange[]
    return {activeVersionChanges, prevVersions, nextVersionChanges}
  }, [data, activeVersion])
  if (!id) return null
  return (
    <AccessoryContainer title="Versions">
      <NextVersions
        changeset={computed}
        id={id}
        activeVersion={activeVersion}
      />
      <ActiveVersions
        changeset={computed}
        id={id}
        activeVersion={activeVersion}
      />
      <PrevVersions
        changeset={computed}
        id={id}
        activeVersion={activeVersion}
      />
    </AccessoryContainer>
  )
}
