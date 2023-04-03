import {H1, Text, XStack, styled} from 'tamagui'

export const TitlebarWrapper = styled(XStack, {
  paddingHorizontal: '$4',
  paddingVertical: 0,
  borderColor: 'transparent',
  backgroundColor: '$gray1',
  borderBottomColor: '$gray5',
  borderWidth: '1px',
  alignItems: 'stretch',
  borderStyle: 'solid',
  variants: {
    platform: {
      macos: {
        paddingLeft: '64px',
      },
    },
  },
})

export const TitlebarSection = styled(XStack, {
  backgroundColor: '$red10',
})

export const TitleText = styled(H1, {
  color: '$gray12',
})
