import {H1, Text, XStack, styled, Button} from 'tamagui'

export const TitlebarWrapper = styled(XStack, {
  paddingHorizontal: '$4',
  paddingVertical: 0,
  width: '100%',
  minHeight: 64,
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
  // color: '$gray12',
  size: '$4',
})

export const TitlebarButton = styled(Button, {
  color: '$gray2Light',
  borderRadius: '$4',
  overflow: 'hidden',
  minHeight: 24,
  minWidth: 24,
  hoverStyle: {
    backgroundColor: '$red12',
  },
  variants: {
    variant: {
      solid: {},
      outlined: {
        borderColor: '$red6',
        borderStyle: 'solid',
        borderWidth: '$10',
      },
      ghost: {},
    },
  },
})
