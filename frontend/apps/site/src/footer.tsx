import {SizableText, XStack, YStack} from '@shm/ui'
import {NextLink} from 'src/next-link'

export default function Footer() {
  return (
    <YStack alignItems="center">
      <XStack
        padding="$6"
        $gtLg={{
          padding: '$4',
        }}
        maxWidth={680}
        width="100%"
      >
        <SizableText size="$2" color="$color9">
          Powered by{' '}
          <NextLink href="https://mintter.com" target="_blank">
            Mintter
          </NextLink>
          {' + '}
          <NextLink href="https://hyper.media" target="_blank">
            The Hypermedia Protocol
          </NextLink>
        </SizableText>
      </XStack>
    </YStack>
  )
}
