import {SizableText, XStack, YStack} from '@mintter/ui'
import {NextLink} from 'next-link'

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
          <NextLink
            href="https://mintter.com"
            target="_blank"
            style={{color: 'var(--blue9)'}}
          >
            MintterHypermedia
          </NextLink>
        </SizableText>
      </XStack>
    </YStack>
  )
}
