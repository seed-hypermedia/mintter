import {styled, YStack} from 'tamagui'

export const SiteAside = styled(YStack, {
  paddingHorizontal: '$4',
  paddingVertical: '$2',
  borderColor: '$borderColor',
  borderWidth: 1,
  borderRadius: '$3',
  $gtSm: {
    padding: '$4',
  },
})
