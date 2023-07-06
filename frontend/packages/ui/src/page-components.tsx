import {styled, YStack, XStack} from 'tamagui'

export const MainContainer = styled(YStack, {
  paddingRight: '$5',
  width: '100%',
  maxWidth: 800,
  paddingBottom: 300,
  $gtSm: {
    width: '75%',
  },
})

export const SideContainer = styled(YStack, {
  // maxWidth: 300,
  width: '100%',
  gap: '$4',
  $gtSm: {
    width: '25%',
    maxWidth: 300,
  },
})
