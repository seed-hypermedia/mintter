import {styled, YStack} from 'tamagui'

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
export const Container = ContainerLarge
