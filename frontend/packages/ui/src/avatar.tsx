import {Avatar, FontSizeTokens, Text} from 'tamagui'
import {useMemo} from 'react'

export function UIAvatar({
  url,
  id,
  label,
  size = '$3',
  color,
}: {
  url?: string
  size?: FontSizeTokens
  color?: string
  label?: string
  id?: string
}) {
  let avatarColor = useMemo(
    () => (id ? getRandomColor(id) : color ? color : '$blue8'),
    [id, color],
  )

  return (
    <Avatar circular size={size} alignItems="center" justifyContent="center">
      {url && <Avatar.Image accessibilityLabel={label} source={{uri: url}} />}
      <Avatar.Fallback
        backgroundColor={color || avatarColor}
        alignItems="center"
        justifyContent="center"
      >
        <Text
          fontFamily="$body"
          textTransform="capitalize"
          fontWeight="700"
          fontSize={size}
          color="black"
        >
          {label ? label[0] : id ? id[0] : '?'}
        </Text>
      </Avatar.Fallback>
    </Avatar>
  )
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
