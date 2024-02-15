import {Heading, PageSection, SizableText, YStack} from '@mintter/ui'
import {SiteHead} from './site-head'

export function SmallContainer({
  children,
  ...props
}: React.PropsWithChildren<React.ComponentProps<typeof YStack>>) {
  return (
    <YStack
      paddingVertical="$7"
      paddingHorizontal="$5"
      borderRadius="$5"
      elevation="$1"
      borderColor="$color5"
      borderWidth={1}
      backgroundColor="$color3"
      gap="$3"
      {...props}
    >
      {children}
    </YStack>
  )
}
export function ErrorPage({
  title,
  description,
  children,
  ...props
}: {
  title: string
  description?: string
  children?: React.ReactNode
} & React.ComponentProps<typeof SmallContainer>) {
  return (
    <YStack flex={1}>
      <SiteHead pageTitle={title} />
      <PageSection.Root>
        <PageSection.Side />
        <PageSection.Content tag="main" id="main-content" tabIndex={-1}>
          <SmallContainer {...props}>
            <Heading fontWeight="bold">{title}</Heading>
            <SizableText color="$color9" textAlign="center">
              {description}
            </SizableText>
            {children}
          </SmallContainer>
        </PageSection.Content>
        <PageSection.Side />
      </PageSection.Root>
    </YStack>
  )
}
