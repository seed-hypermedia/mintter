import {XStack} from '@mintter/ui'
import {SizeTokens} from '@mintter/ui'

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
      backgroundColor="$color4"
      borderRadius="$1"
    />
  )
}
