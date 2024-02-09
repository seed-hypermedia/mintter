import {ComponentProps, ReactNode} from 'react'
import {styled, XStack, YStack} from 'tamagui'

const variants = {
  hide: {
    true: {
      pointerEvents: 'none',
      opacity: 0,
    },
  },
  clearVerticalSpace: {
    true: {
      paddingVertical: 0,
    },
  },
} as const

export function PageContainer({
  children,
  ...props
}: {children: ReactNode} & ComponentProps<typeof YStack>) {
  return (
    <XStack jc="center">
      <YStack
        f={1}
        paddingHorizontal="$4"
        maxWidth={898}
        alignSelf="center"
        {...props}
      >
        {children}
      </YStack>
    </XStack>
  )
}

export const ContainerDefault = styled(YStack, {
  marginHorizontal: 'auto',
  paddingHorizontal: '$4',
  paddingVertical: '$6',
  width: '100%',
  $gtSm: {
    maxWidth: 700,
    paddingRight: '$2',
  },

  $gtMd: {
    maxWidth: 740,
    paddingRight: '$2',
  },

  $gtLg: {
    maxWidth: 800,
    paddingRight: '$10',
  },

  variants,
})

export const ContainerLarge = styled(YStack, {
  marginHorizontal: 'auto',
  paddingHorizontal: '$4',
  paddingVertical: '$6',
  width: '100%',
  maxWidth: 760,
  $gtLg: {
    maxWidth: 940,
  },
  variants,
})

export const ContainerXL = styled(YStack, {
  marginHorizontal: 'auto',
  paddingHorizontal: '$4',
  paddingVertical: '$6',
  width: '100%',
  $gtSm: {
    maxWidth: 980,
  },

  $gtMd: {
    maxWidth: 1240,
  },

  $gtLg: {
    maxWidth: 1440,
  },

  variants,
})

export const AppContainer = ContainerLarge
export const Container = ContainerLarge
