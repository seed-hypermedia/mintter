import {styled, XStack, YStack} from 'tamagui'

export const ArticleContainer = styled(XStack, {})

export const MainContainer = styled(YStack, {
  ml: '-$4',
  paddingRight: '$5',
  width: '75%',
  maxWidth: 800,
})

export const SideContainer = styled(YStack, {
  width: '25%',
  float: 'right',
  maxWidth: 300,
})
