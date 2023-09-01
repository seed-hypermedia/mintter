import {YStack} from '@mintter/ui'
import {Placeholder} from '../components/placeholder-box'

export function DocumentPlaceholder() {
  // TODO: update shell
  return (
    <YStack
      marginTop="$7"
      width="100%"
      maxWidth="600px"
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
    <YStack width="600px" gap="$2">
      <Placeholder width="100%" />
      <Placeholder width="92%" />
      <Placeholder width="84%" />
      <Placeholder width="90%" />
    </YStack>
  )
}
