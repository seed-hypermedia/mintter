import {ReactNode} from 'react'
import {ScrollView, styled, YStack, Text, ScrollViewProps} from 'tamagui'

export const AppMain = styled(YStack, {
  flexDirection: 'column',
  fullscreen: true,
  backgroundColor: '$blue10',
})

export const MainStyled = styled(YStack, {
  name: 'MAIN-STYLED',
  flex: 1,
})

export const MainWrapper = ({
  children,
  onScroll,
  noScroll = false,
}: {
  children: ReactNode
  onScroll?: ScrollViewProps['onScroll']
  noScroll?: boolean
}) => (
  <MainStyled flex={1}>
    {noScroll ? (
      <>{children}</>
    ) : (
      <ScrollView onScroll={onScroll}>{children}</ScrollView>
    )}
  </MainStyled>
)
