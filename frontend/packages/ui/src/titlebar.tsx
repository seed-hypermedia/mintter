// @ts-nocheck
import {SizableText, styled, XStack, YStack} from 'tamagui'

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
  ai: 'center',
  gap: '$2',
  userSelect: 'none',
})

export const TitleText = styled(SizableText, {
  whiteSpace: 'nowrap',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
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
