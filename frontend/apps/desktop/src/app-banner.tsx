import {getVariable, SizableText, useTheme, XStack} from '@mintter/ui'
import {MouseEventHandler, ReactNode} from 'react'

export function AppBanner({
  children,
  ...props
}: {
  children: ReactNode
  onMouseEnter?: MouseEventHandler<HTMLDivElement>
}) {
  const theme = useTheme()

  const color = getVariable(
    ('yellow3' in theme ? theme['yellow3'] : undefined) ||
      'yellow3' ||
      null ||
      '#f00',
  )
  console.log('🚀 ~ file: app-banner.tsx:15 ~ color:', color)
  return (
    <XStack
      backgroundColor={color.val}
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
      cursor="pointer"
      paddingHorizontal="$3"
      {...props}
    >
      {children}
    </XStack>
  )
}

export function BannerText(props: any) {
  return <SizableText {...props} size="$1" textAlign="center" />
}
