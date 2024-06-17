import {Circle, XStack} from '@shm/ui'

export function OnlineIndicator({online}: {online: boolean}) {
  return (
    <XStack alignItems="center" w={20} jc="center">
      <Circle size={8} backgroundColor={online ? '$green10' : '$gray8'} />
    </XStack>
  )
}
