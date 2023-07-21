import {Avatar as StyledAvatar, FontSizeTokens, styled, Text} from 'tamagui'
import {useMemo} from 'react'

export function UIAvatar({
  url,
  accountId,
  alias,
  size = '$3',
  color,
}: {
  url?: string
  accountId?: string
  size?: FontSizeTokens
  color?: string
  alias: string
}) {
  let initials = useMemo(() => alias[0], [alias])
  let avatarColor = useMemo(
    () => (accountId ? getRandomColor(accountId) : '$blue8'),
    [accountId],
  )

  return (
    <StyledAvatar circular size={size}>
      <StyledAvatar.Image src={url} />
      <StyledAvatar.Fallback
        backgroundColor={color || avatarColor}
        alignItems="center"
        justifyContent="center"
        enterStyle={{
          opacity: 0,
        }}
      >
        {initials ? (
          <Text
            fontFamily="$body"
            textTransform="capitalize"
            fontWeight="700"
            fontSize={size}
            color="black"
          >
            {initials}
          </Text>
        ) : null}
      </StyledAvatar.Fallback>
    </StyledAvatar>
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
