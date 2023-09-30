import {TimelineChange, useEntityTimeline} from '@mintter/app/models/changes'
import {useAccount} from '@mintter/app/src/models/accounts'
import {useNavigate} from '@mintter/app/src/utils/useNavigate'
import {Change, formattedDate, pluralS} from '@mintter/shared'
import {UnpackedHypermediaId} from '@mintter/shared/src/utils/entity-id-url'
import {PanelCard, SizableText, XStack, YStack} from '@mintter/ui'
import {useMemo} from 'react'
import {NavRoute, useNavRoute} from '../utils/navigation'
import {AccessoryContainer} from './accessory-sidebar'
import {AccountLinkAvatar} from './account-link-avatar'

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

  const navRoute = useNavRoute()
  const isActive = activeVersion === change.id

  const shouldDisplayAuthorName =
    !prevListedChange || change.author !== prevListedChange.change.author

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
  return (
    <PanelCard
      disabled={!destRoute}
      active={isActive}
      author={author.data}
      avatar={<AccountLinkAvatar accountId={change.author} />}
      date={formattedDate(change.createTime)}
      onPress={() => {
        console.log('PRESSED')
        destRoute && navigate(destRoute)
      }}
    />
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
