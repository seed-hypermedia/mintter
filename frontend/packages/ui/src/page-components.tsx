import {Main, SizableText, Stack, YStack, styled} from 'tamagui'
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
    <YStack flex={1} justifyContent="space-between">
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
  $gtMd: {
    width: '25%',
    maxWidth: 300,
  },
})

const PageSectionRoot = styled(Stack, {
  flex: 1,
  position: 'relative',
  flexDirection: 'column',
  width: '100%',
  $gtMd: {
    flexDirection: 'row',
    justifyContent: 'center',
  },
  // borderWidth: 1,
  // borderColor: '$color6',
})

const PageSectionContent = styled(YStack, {
  variants: {
    show: {
      true: {
        display: 'inherit',
      },
      false: {
        display: 'none',
      },
    },
  },
  paddingRight: '$4',
  paddingBottom: '$4',
  width: '100%',
  flex: 1,
  maxWidth: 680,
  alignSelf: 'center',
  $gtMd: {
    flex: 3,
    flexGrow: 1,
    alignSelf: 'auto',
  },
  // borderWidth: 1,
  // borderColor: '$color6',
})

const PageSectionSide = styled(YStack, {
  variants: {
    show: {
      true: {
        padding: '$2',
      },
    },
  },
  $gtMd: {
    // padding: '$6',
    width: '100%',
    flex: 1,
    position: 'relative',
    maxWidth: 300,
    // alignSelf: 'center',
    alignSelf: 'auto',
  },
  $gtLg: {
    maxWidth: 640,
  },
  // borderWidth: 1,
  // borderColor: '$color6',
})

export const SideSection = styled(YStack, {
  paddingVertical: '$4',
  gap: '$1',
  borderTopColor: '$color6',
  borderTopWidth: 1,
  marginHorizontal: '$4',
})

export const SideSectionTitle = styled(SizableText, {
  size: '$1',
  fontWeight: '800',
  opacity: 0.4,
})

const Root = PageSectionRoot
const Content = PageSectionContent
const Side = PageSectionSide

export const PageSection = {Root, Content, Side}
