import {Circle, XStack} from '@mintter/ui'

export function OnlineIndicator({online}: {online: boolean}) {
  return (
    <XStack alignItems="center" gap="$3">
      <Circle size={8} backgroundColor={online ? '$green10' : '$gray8'} />
    </XStack>
  )
}
