import {H1, styled, XStack, YStack} from 'tamagui'

export const TitlebarWrapper = styled(YStack, {
  name: 'TitlebarWrapper',
  // theme: 'gray',
  paddingVertical: 0,
  width: '100%',
  minHeight: 40,
  borderColor: 'transparent',
  backgroundColor: '$backgroundStrong',
  borderBottomColor: '$color5',
  borderWidth: '1px',
  alignItems: 'stretch',
  justifyContent: 'center',
  borderStyle: 'solid',
  flex: 0,
  flexGrow: 0,
  flexShrink: 0,
})

export const TitlebarRow = styled(XStack, {
  name: 'TitlebarRow',
  paddingHorizontal: '$2',
})

export const TitlebarSection = styled(XStack, {
  name: 'TitlebarSection',
  alignItems: 'center',
  gap: '$2',
  userSelect: 'none',
})

export const TitleTextH1 = styled(H1, {
  name: 'TitlebarH1',
  color: '$color12',
  fontSize: '$4',
  userSelect: 'none',
  cursor: 'default',
  padding: 0,
  margin: 0,
  textTransform: 'none',
  fontWeight: '700',
})
export function TitleText(props) {
  return <TitleTextH1 {...props} />
}
