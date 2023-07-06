import {YStack, styled} from 'tamagui'

const variants = {
  hide: {
    true: {
      pointerEvents: 'none',
      opacity: 0,
    },
  },
} as const

export const ContainerDefault = styled(YStack, {
  marginHorizontal: 'auto',
  paddingHorizontal: '$4',
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

export const SidebarContainer = styled(YStack, {
  marginHorizontal: 'auto',
  paddingHorizontal: '$4',
  width: '100%',
  maxWidth: 760,
  marginTop: '$6',
  borderColor: '$gray6',
  gap: '$2',
  borderTopWidth: 1,
  paddingVertical: '$6',
  $gtXl: {
    borderTopWidth: 0,
    // @ts-expect-error
    position: 'fixed', // tamagui doesnt like fixed I guess
    right: 40,
    top: 0,
    width: 300,
    bottom: 0,
    overflow: 'scroll',
  },
})

export const Container = styled(YStack, {})

export const ContainerLarge = styled(YStack, {
  marginHorizontal: 'auto',
  paddingHorizontal: '$4',
  width: '100%',
  maxWidth: 760,
  $gtXxl: {
    maxWidth: 940,
  },
  variants,
})

export const ContainerXL = styled(YStack, {
  marginHorizontal: 'auto',
  paddingHorizontal: '$4',
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
