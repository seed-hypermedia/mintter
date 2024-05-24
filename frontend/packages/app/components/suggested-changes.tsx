import {HMAccount, formattedDateMedium} from '@mintter/shared'
import {ArrowRight, Check} from '@tamagui/lucide-icons'
import {Button, Checkbox, SizableText, XStack, YStack} from 'tamagui'
import {TimelineChange, useSuggestedChanges} from '../models/changes'
import {useNavRoute} from '../utils/navigation'
import {PublicationRoute} from '../utils/routes'
import {useNavigate} from '../utils/useNavigate'
import {AccessoryContainer} from './accessory-sidebar'

function SuggestedChangesOldVersion({route}: {route: PublicationRoute}) {
  const navigate = useNavigate()
  return (
    <YStack p="$4" gap="$4">
      <SizableText>
        You are viewing an older version of this publication. Go to the latest
        to merge suggested changes.
      </SizableText>
      <Button
        theme="blue"
        iconAfter={ArrowRight}
        onPress={() => {
          navigate({...route, versionId: undefined})
        }}
      >
        Go to Latest Version
      </Button>
    </YStack>
  )
}

function SuggestedChangesSelector({
  route,
  suggestedChanges,
  variantVersion,
}: {
  route: PublicationRoute
  suggestedChanges: ReturnType<typeof useSuggestedChanges>
  variantVersion?: string
}) {
  const replace = useNavigate('replace')
  const {suggested, allChanges, alreadyMerged} = suggestedChanges
  const selectedUnmergedChanges = new Set<string>()
  const walkSelectedUnmergedChanges = new Set<string>(
    route.selectedMergeChanges || [],
  )
  while (walkSelectedUnmergedChanges.size) {
    walkSelectedUnmergedChanges.forEach((id) => {
      walkSelectedUnmergedChanges.delete(id)
      if (alreadyMerged?.has(id)) return
      selectedUnmergedChanges.add(id)
      allChanges?.[id]?.deps.forEach((depId) => {
        walkSelectedUnmergedChanges.add(depId)
      })
    })
  }
  function toggleChange(changeId: string) {
    const wasSelected = selectedUnmergedChanges.has(changeId)
    if (wasSelected) {
      const changeIdWithDeps = new Set<string>()
      const walkUnmergedDeps = new Set<string>([changeId])
      while (walkUnmergedDeps.size) {
        walkUnmergedDeps.forEach((id) => {
          walkUnmergedDeps.delete(id)
          if (alreadyMerged?.has(id)) return
          changeIdWithDeps.add(id)
          allChanges?.[id]?.citations.forEach((citiationChangeId) => {
            walkUnmergedDeps.add(citiationChangeId)
          })
        })
      }
      replace({
        ...route,
        selectedMergeChanges: route.selectedMergeChanges?.filter(
          (id) => !changeIdWithDeps.has(id),
        ),
      })
    } else {
      replace({
        ...route,
        selectedMergeChanges: [...(route.selectedMergeChanges || []), changeId],
      })
    }
  }
  return (
    <YStack p="$4" gap="$4">
      {suggested?.map((change) => {
        if (!change) return null
        return (
          <>
            <SuggestedChangeRow
              change={change}
              isSelected={selectedUnmergedChanges.has(change.id)}
              onToggle={() => toggleChange(change.id)}
            />
            <YStack marginLeft="$4">
              {change.flatDeps.map((depChange) => (
                <SuggestedChangeRow
                  change={depChange}
                  isSelected={selectedUnmergedChanges.has(depChange.id)}
                  onToggle={() => toggleChange(depChange.id)}
                />
              ))}
            </YStack>
          </>
        )
      })}
    </YStack>
  )
}

function SuggestedChangeRow({
  change,
  isSelected,
  onToggle,
}: {
  change: TimelineChange & {author?: HMAccount | null}
  isSelected: boolean
  onToggle: () => void
}) {
  return (
    <XStack key={change.id}>
      <YStack>
        <SizableText>{change.author?.profile?.alias}</SizableText>
        <SizableText>
          {formattedDateMedium(change.change.createTime)}
        </SizableText>
      </YStack>
      <Checkbox
        checked={isSelected}
        onCheckedChange={() => {
          onToggle()
        }}
      >
        <Checkbox.Indicator>
          <Check />
        </Checkbox.Indicator>
      </Checkbox>
    </XStack>
  )
}

export function EntitySuggestedChangesAccessory({
  entityId,
  variantVersion,
}: {
  entityId?: string
  variantVersion?: string
}) {
  const route = useNavRoute()
  const suggestedChanges = useSuggestedChanges(entityId, variantVersion)
  if (route.key !== 'publication')
    throw new Error(
      'EntitySuggestedChangesAccessory is only for publication route',
    )
  let content = (
    <SuggestedChangesSelector
      suggestedChanges={suggestedChanges}
      variantVersion={variantVersion}
      route={route}
    />
  )
  if (route.versionId && route.versionId !== variantVersion)
    content = <SuggestedChangesOldVersion route={route} />
  return (
    <AccessoryContainer title={`Suggested Changes`}>
      {content}
    </AccessoryContainer>
  )
}
