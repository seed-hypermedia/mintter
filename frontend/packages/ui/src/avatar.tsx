// @ts-nocheck
import {useMemo} from 'react'
import {Avatar, SizableText, XStack} from 'tamagui'

export type UIAvatarProps = {
  url?: string
  size?: number
  color?: string
  label?: string
  id?: string
  onPress?: () => void
}

export function UIAvatar({
  url,
  id,
  label,
  size = 20,
  color,
  onPress,
}: UIAvatarProps) {
  let avatarColor = useMemo(
    () => (id ? getRandomColor(id) : color ? color : '$blue8'),
    [id, color],
  )

  function clampNumber(value: number, min: number, max: number): number {
    return Math.min(Math.max(value, min), max)
  }

  let textSize = clampNumber(size / 2, 10, 56)

  let avatar = (
    <Avatar circular size={size} alignItems="center" justifyContent="center">
      {url ? (
        <Avatar.Image
          source={{
            uri: url,
            width: size,
            height: size,
          }}
        />
      ) : null}
      <Avatar.Fallback
        delayMs={600}
        backgroundColor={color || avatarColor}
        alignItems="center"
        justifyContent="center"
      >
        <SizableText
          width={size / 2}
          textAlign="center"
          fontFamily="$body"
          textTransform="capitalize"
          fontWeight="700"
          fontSize={textSize}
          color="black"
        >
          {label ? label[0] : id ? id[0] : '?'}
        </SizableText>
      </Avatar.Fallback>
    </Avatar>
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
