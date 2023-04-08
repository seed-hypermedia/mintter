import {Menu} from './icons'
import {H1, XStack, styled, Button, YStack} from 'tamagui'

export const TitlebarWrapper = styled(YStack, {
  theme: 'gray',
  paddingVertical: 0,
  width: '100%',
  minHeight: 40,
  borderColor: 'transparent',
  backgroundColor: '$gray1',
  borderBottomColor: '$gray5',
  borderWidth: '1px',
  alignItems: 'stretch',
  justifyContent: 'center',
  borderStyle: 'solid',
  flex: 0,
  flexGrow: 0,
  flexShrink: 0,
  variants: {
    platform: {
      macos: {
        paddingLeft: '72px',
      },
      windows: {},
      linux: {},
    },
  },
})

export const TitlebarRow = styled(XStack, {
  paddingHorizontal: '$2',
})

export const TitlebarSection = styled(XStack, {
  alignItems: 'center',
  gap: '$2',
})

export const TitleTextH1 = styled(H1, {
  // color: '$gray12',
  size: '$4',
  userSelect: 'none',
  cursor: 'default',
  padding: 0,
  margin: 0,
})
export function TitleText(props) {
  return <TitleTextH1 {...props} data-tauri-drag-region />
}

const TitlebarStyledButton = styled(Button, {
  color: '$gray2Light',
  size: '$2',
  borderRadius: '$4',
  overflow: 'hidden',
  minHeight: 24,
  minWidth: 24,
  variants: {
    variant: {
      solid: {},
      outlined: {
        borderColor: '$color',
        borderStyle: 'solid',
        borderWidth: '$10',
      },
      ghost: {},
    },
  },
})

export const TitlebarButton = ({}) => {
  return <TitlebarStyledButton icon={Menu}></TitlebarStyledButton>
}
