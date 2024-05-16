// @ts-nocheck
import {useMemo} from 'react'
import {SizableText, XStack} from 'tamagui'

export type UIAvatarProps = {
  url?: string
  size?: number
  color?: string
  label?: string
  id?: string
  onPress?: () => void
}

let colors = [
  'blue',
  'gray',
  'green',
  'orange',
  'pink',
  'purple',
  'red',
  'yellow',
  'mint',
]

export function UIAvatar({
  url,
  id,
  label,
  size = 20,
  color,
  onPress,
}: UIAvatarProps) {
  let avatarColor = useMemo(() => {
    if (color) return color
    let idx = Math.floor(Math.random() * colors.length)
    return `$${colors[idx]}6`
  }, [id, color])

  let text = label ? label[0] : id ? id[0] : '?'

  let avatar = (
    <XStack
      width={size}
      height={size}
      borderRadius={size}
      overflow="hidden"
      backgroundColor={avatarColor}
      alignItems="center"
      justifyContent="center"
      position="relative"
    >
      {url ? (
        <img
          src={url}
          style={{minWidth: '100%', minHeight: '100%', objectFit: 'cover'}}
        />
      ) : (
        <SizableText
          fontWeight="600"
          fontSize={size * 0.55}
          display="block"
          width={size / 2}
          height={size / 2}
          lineHeight={size / 2}
          textAlign="center"
          color="$color"
        >
          {text.toUpperCase()}
        </SizableText>
      )}
    </XStack>
  )

  if (onPress) {
    return (
      <XStack cursor="pointer" onPress={onPress}>
        {avatar}
      </XStack>
    )
  }
  return avatar
}

export function getRandomColor(id: string) {
  let hash = 0
  for (let i = 0; i < id.length; i++) {
    hash = id.charCodeAt(i) + ((hash << 6) - hash)
    hash = hash & hash // Convert to 32bit integer
  }
  const shortened = hash % 360
  return `hsl(${shortened},60%,80%)`
}
