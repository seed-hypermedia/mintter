import {SizableText, XStack} from '@shm/ui'
import {ReactNode} from 'react'

export function AppBanner({
  children,
  ...props
}: {
  children: ReactNode
  onPress?: () => void
}) {
  return (
    <XStack
      backgroundColor="$yellow1"
      width="100%"
      position="absolute"
      top={0}
      left={0}
      enterStyle={{
        opacity: 0,
        transform: [{translateY: -32}],
      }}
      exitStyle={{
        opacity: 0,
        transform: [{translateY: -32}],
      }}
      transform={[{translateY: 0}]}
      opacity={1}
      padding="$1"
      borderColor="$borderColor"
      hoverStyle={{
        borderColor: '$borderColorHover',
      }}
      borderBottomWidth={1}
      paddingHorizontal="$3"
      userSelect="none"
      {...props}
    >
      {children}
    </XStack>
  )
}

export function BannerText(props: any) {
  return <SizableText {...props} size="$1" textAlign="center" />
}
