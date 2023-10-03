import {PageSection, SizableText} from '@mintter/ui'
import {NextLink} from 'next-link'
import {useRouter} from 'next/router'

export default function Footer({hmUrl}: {hmUrl?: string}) {
  let router = useRouter()
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
        {hmUrl ? (
          <SizableText size="$2">
            Open in{' '}
            <NextLink href={hmUrl} target="_blank">
              Mintter App
            </NextLink>
          </SizableText>
        ) : null}
      </PageSection.Content>
      <PageSection.Side />
    </PageSection.Root>
  )
}
