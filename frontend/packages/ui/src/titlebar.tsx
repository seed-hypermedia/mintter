import {H1, styled, XStack, YStack} from 'tamagui'

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
      macos: {},
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
  userSelect: 'none',
})

export const TitleTextH1 = styled(H1, {
  // color: '$gray12',
  size: '$4',
  userSelect: 'none',
  cursor: 'default',
  padding: 0,
  margin: 0,
  letterSpacing: 'auto',
  textTransform: 'none',
  fontWeight: '700',
})
export function TitleText(props) {
  return (
    <span data-tauri-drag-region>
      <TitleTextH1 {...props} data-tauri-drag-region />
    </span>
  )
}
