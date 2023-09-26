import {TimelineChange, useEntityTimeline} from '@mintter/app/models/changes'
import {Avatar} from '@mintter/app/src/components/avatar'
import {useAccount} from '@mintter/app/src/models/accounts'
import {useNavigate} from '@mintter/app/src/utils/useNavigate'
import {
  Change,
  formattedDate,
  formattedDateMedium,
  labelOfEntityType,
  pluralS,
  unpackHmId,
} from '@mintter/shared'
import {
  Button,
  ButtonText,
  Heading,
  SizableText,
  View,
  XStack,
  YStack,
  styled,
} from '@mintter/ui'
import {getAvatarUrl} from '../utils/account-url'
import {AccessoryContainer} from './accessory-sidebar'
import {UnpackedHypermediaId} from '@mintter/shared/src/utils/entity-id-url'
import {useMemo} from 'react'
import {NavRoute, useNavRoute} from '../utils/navigation'

const SubHeading = styled(Heading, {
  size: '$2',
  marginTop: '$4',
  marginBottom: '$1',
  marginHorizontal: '$4',
})

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
    <ButtonText onPress={openAccount}>
      {author?.data?.profile?.alias || change.author}
    </ButtonText>
  ) : (
    changeTimeText
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
  return (
    <View
      padding={0}
      onPress={() => {
        destRoute && navigate(destRoute)
      }}
      disabled={!destRoute}
      flexDirection="column"
      gap="$3"
      paddingHorizontal="$4"
      paddingVertical="$2"
      backgroundColor={isActive ? '$green4' : 'transparent'}
      alignItems="center"
      // group="change"
      position="relative"
      hoverStyle={{
        backgroundColor: isActive ? '$green4' : 'transparent',
        cursor: 'pointer',
      }}
    >
      <YStack alignSelf="stretch">
        <XStack alignItems="center" justifyContent="flex-start" gap="$2">
          <Button size="$2" circular chromeless onPress={openAccount}>
            <Avatar
              id={change.author}
              label={author?.data?.profile?.alias}
              size={'$2'}
              url={getAvatarUrl(author?.data?.profile?.avatar)}
            />
          </Button>

          {topRow}
        </XStack>

        {dateRow && (
          <XStack alignItems="center" justifyContent="flex-start" gap="$2">
            <View width={28} />
            {dateRow}
          </XStack>
        )}
      </YStack>
    </View>
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
      <SubHeading>Previous Versions</SubHeading>
      <YStack>
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
      <SubHeading>{subheading}</SubHeading>
      <YStack>
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
      <SubHeading>
        {pluralS(nextVersionChanges.length, 'Next Version')}
      </SubHeading>
      <YStack>
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
    <AccessoryContainer>
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
