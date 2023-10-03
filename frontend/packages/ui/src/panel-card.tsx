import {SizableText, XStack, YStack} from 'tamagui'
import {formattedDate, Account} from '@mintter/shared'

export function PanelCard({
  title,
  content,
  author,
  date,
  onPress,
  avatar,
  active = false,
  shorter = false,
}: {
  title?: string
  content?: string
  author?: Account
  date?: any
  onPress?: () => void
  avatar?: Element | null
  active?: boolean
  shorter?: boolean
}) {
  return (
    <YStack
      overflow="hidden"
      borderRadius="$2"
      backgroundColor={active ? '$backgroundHover' : 'transparent'}
      hoverStyle={{
        cursor: 'pointer',
        backgroundColor: '$backgroundHover',
      }}
      padding="$4"
      paddingVertical={shorter ? '$1' : '$4'}
      gap="$2"
      onPress={onPress}
    >
      {/* <YStack
        position="absolute"
        width={2}
        height={isFirst || isLast ? '50%' : '100%'}
        top={isFirst ? '50%' : 0}
        left={(avatarSize - 2) / 2}
        backgroundColor="$color5"
      /> */}
      <XStack
        gap="$2"
        ai="center"
        // borderColor="$color5" borderWidth={1}
      >
        {avatar}
        {author && (
          <SizableText size="$2">{author.profile?.alias || '...'}</SizableText>
        )}
        <XStack flex={1} />
        {date && (
          <SizableText size="$2" color="$color9" paddingHorizontal="$1">
            {date}
          </SizableText>
        )}
      </XStack>
      {title ||
        (content && (
          <YStack
            // borderColor="$color5"
            // borderWidth={1}
            gap="$2"
            flex={1}
          >
            {title && (
              <SizableText
                textOverflow="ellipsis"
                overflow="hidden"
                whiteSpace="nowrap"
                fontFamily="$body"
              >
                {title}
              </SizableText>
            )}
            {content && (
              <SizableText color="$color10" overflow="hidden" maxHeight={69}>
                {content}
              </SizableText>
            )}
          </YStack>
        ))}
    </YStack>
  )
}
