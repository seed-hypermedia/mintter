import {Placeholder} from '@/components/placeholder-box'
import {YStack} from '@shm/ui'

export function DocumentPlaceholder() {
  return (
    <YStack
      marginTop="$7"
      width="100%"
      maxWidth={600}
      gap="$6"
      marginHorizontal="auto"
    >
      <BlockPlaceholder />
      <BlockPlaceholder />
      <BlockPlaceholder />
      <BlockPlaceholder />
      <BlockPlaceholder />
    </YStack>
  )
}

function BlockPlaceholder() {
  return (
    <YStack width={600} gap="$2">
      <Placeholder width="100%" />
      <Placeholder width="92%" />
      <Placeholder width="84%" />
      <Placeholder width="90%" />
    </YStack>
  )
}
