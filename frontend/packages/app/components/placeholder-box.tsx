import {SizeTokens, XStack} from '@shm/ui'

export const Placeholder = ({
  width = '100%',
  height = 16,
}: {
  width?: SizeTokens | number | string
  height?: SizeTokens | number | string
}) => {
  return (
    <XStack
      width={width}
      height={height}
      backgroundColor="$color5"
      borderRadius="$1"
    />
  )
}
