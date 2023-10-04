import {PageSection, SizableText} from '@mintter/ui'
import {NextLink} from 'next-link'
import {useRouter} from 'next/router'

export default function Footer() {
  return (
    <PageSection.Root tag="footer">
      <PageSection.Side />
      <PageSection.Content>
        <SizableText size="$2">
          Powered by{' '}
          <NextLink href="https://mintter.com" target="_blank">
            MintterHypermedia
          </NextLink>
        </SizableText>
      </PageSection.Content>
      <PageSection.Side />
    </PageSection.Root>
  )
}
