// @ts-nocheck
import {ScrollView, XStack, YStack, YStackProps, styled} from 'tamagui'

export const AppMain = styled(YStack, {
  flexDirection: 'column',
  fullscreen: true,
  backgroundColor: '$blue10',
})

export const MainStyled = styled(YStack, {
  flex: 1,
  overflow: 'hidden',
})

export const YDebug = (props) => <YStack {...props} />
YDebug.displayName = 'YMintterDebug'
