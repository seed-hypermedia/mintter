import {styled, YStack} from 'tamagui'

export const ArticleContainer = styled(YStack, {})

export const MainContainer = styled(YStack, {
  paddingRight: '$5',
  width: '100%',
  maxWidth: 800,
  $gtSm: {
    width: '75%',
  },
})

export const SideContainer = styled(YStack, {
  maxWidth: 300,
  width: '100%',
  $gtSm: {
    width: '25%',
    maxWidth: 300,
  },
})
