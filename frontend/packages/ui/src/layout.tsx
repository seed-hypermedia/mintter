import {ScrollView, ScrollViewProps, YStack, YStackProps, styled} from 'tamagui'

export const AppMain = styled(YStack, {
  flexDirection: 'column',
  fullscreen: true,
  backgroundColor: '$blue10',
})

export const MainStyled = styled(YStack, {
  flex: 1,
  overflow: 'hidden',
})

export const MainWrapper = ({
  children,
  noScroll = false,
  ...props
}: YStackProps & {
  noScroll?: boolean
}) => (
  <YStack flex={1} className="content-wrapper" {...props}>
    {noScroll ? children : <ScrollView>{children}</ScrollView>}
  </YStack>
)

export const YDebug = (props) => <YStack {...props} />
YDebug.displayName = 'YMintterDebug'
