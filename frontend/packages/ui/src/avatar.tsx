import {useMemo} from 'react'
import {Avatar, SizableText} from 'tamagui'

export function UIAvatar({
  url,
  id,
  label,
  size = 20,
  color,
}: {
  url?: string
  size?: number
  color?: string
  label?: string
  id?: string
}) {
  let avatarColor = useMemo(
    () => (id ? getRandomColor(id) : color ? color : '$blue8'),
    [id, color],
  )

  let textSize = size > 32 ? 24 : 14

  return (
    <Avatar circular size={size} alignItems="center" justifyContent="center">
      {url && (
        <Avatar.Image
          source={{
            uri: 'https://placekitten.com/200/300',
            width: 200,
            height: 300,
          }}
        />
      )}
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
