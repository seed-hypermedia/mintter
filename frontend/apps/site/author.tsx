import {Paragraph, Text, useMedia, FontSizeTokens, SiteAside} from '@mintter/ui'
import {Publication, formattedDate, Account} from '@mintter/shared'
import {useMemo} from 'react'

export function PublicationMetadata({
  publication,
  author,
}: {
  publication?: Publication
  author?: Account | null
}) {
  let media = useMedia()
  let size: FontSizeTokens = useMemo(() => (media.gtSm ? '$5' : '$7'), [media])
  return publication ? (
    <SiteAside>
      <Paragraph size={size}>
        <Text fontFamily="$body" o={0.5}>
          author:&nbsp;
        </Text>
        {author?.profile?.alias}
      </Paragraph>
      <Paragraph size={size}>
        <Text fontFamily="$body" o={0.5}>
          Published at:&nbsp;
        </Text>
        {publication?.document?.publishTime
          ? formattedDate(publication.document.publishTime)
          : null}
      </Paragraph>
      <Paragraph size={size}>
        <Text fontFamily="$body" o={0.5}>
          Last update:&nbsp;
        </Text>
        {publication?.document?.updateTime
          ? formattedDate(publication.document.updateTime)
          : null}
      </Paragraph>
    </SiteAside>
  ) : null
}
