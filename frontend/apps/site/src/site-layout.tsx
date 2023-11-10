import {PageSection, View, YStack} from '@mintter/ui'
import {ReactNode} from 'react'
import Footer from './footer'

export function MainSiteLayout({
  head,
  children,
  leftSide,
  rightSide,
}: {
  head: ReactNode
  children: ReactNode
  leftSide?: ReactNode
  rightSide?: ReactNode
}) {
  return (
    <YStack flex={1}>
      {head}
      <PageSection.Root f={1}>
        <PageSection.Side>
          <YStack
            paddingTop={96}
            display="none"
            // for some reason the layout breaks if this style is applied directly to PageSection.Side
            $gtLg={{display: 'flex'}}
          >
            {leftSide}
          </YStack>
        </PageSection.Side>
        <PageSection.Content>{children}</PageSection.Content>
        <PageSection.Side>
          <YStack
            paddingTop={0}
            // for some reason the layout breaks if this style is applied directly to PageSection.Side
            $gtLg={{paddingTop: 96}}
          ></YStack>
          {rightSide}
        </PageSection.Side>
      </PageSection.Root>
      <PageSection.Side display="inherit" $gtLg={{display: 'none'}}>
        {leftSide}
      </PageSection.Side>
      <Footer />
    </YStack>
  )
}
