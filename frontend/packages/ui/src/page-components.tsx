import {styled, YStack, Main} from 'tamagui'
import {Container} from './container'

export function MainContainer({
  children,
  sidebarAfter,
  sidebarBefore,
}: {
  children: React.ReactNode
  sidebarAfter?: React.ReactElement
  sidebarBefore?: React.ReactElement
}) {
  return (
    <YStack height="100%" flex={1} justifyContent="space-between">
      <YStack $gtXl={{flexDirection: 'row', paddingTop: '$4'}} gap="$2">
        <YStack
          marginHorizontal={'auto'}
          paddingHorizontal="$4"
          width="100%"
          maxWidth={760}
          $gtXl={{
            borderTopWidth: 0,
            width: 300,
            overflow: 'scroll',
          }}
        >
          {sidebarBefore}
        </YStack>
        <Container tag="main" id="main-content" tabIndex={-1}>
          <Main>{children}</Main>
        </Container>
        <YStack
          marginHorizontal={'auto'}
          paddingHorizontal="$4"
          width="100%"
          maxWidth={760}
          borderColor="$gray6"
          gap="$2"
          borderTopWidth={1}
          paddingTop="$6"
          paddingBottom="$6"
          $gtXl={{
            paddingTop: 0,
            borderTopWidth: 0,
            width: 300,
            overflow: 'scroll',
          }}
        >
          {sidebarAfter}
        </YStack>
      </YStack>
    </YStack>
  )
}

export const SideContainer = styled(YStack, {
  // maxWidth: 300,
  width: '100%',
  gap: '$4',
  $gtSm: {
    width: '25%',
    maxWidth: 300,
  },
})
