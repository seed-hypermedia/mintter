import { ScrollView, ScrollViewProps, YStack, styled } from 'tamagui'

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
}: ScrollViewProps & {
  noScroll?: boolean
}) => (
  <MainStyled>
    {noScroll ? (
      <>{children}</>
    ) : (
      <ScrollView {...props}>{children}</ScrollView>
    )}
  </MainStyled>
)
