import {Paragraph, Text, YStack, styled} from 'tamagui'
import {Publication, formattedDate, Account} from '@mintter/shared'

export function PublicationMetadata({
  publication,
  author,
}: {
  publication?: Publication
  author?: Account | null
}) {
  return publication ? (
    <Aside>
      <Paragraph>
        <Text fontFamily="$body" o={0.5}>
          author:&nbsp;
        </Text>
        {author?.profile?.alias}
      </Paragraph>
      <Paragraph>
        <Text fontFamily="$body" o={0.5}>
          Published at:&nbsp;
        </Text>
        {publication?.document?.publishTime
          ? formattedDate(publication.document.publishTime)
          : null}
      </Paragraph>
      <Paragraph>
        <Text fontFamily="$body" o={0.5}>
          Last update:&nbsp;
        </Text>
        {publication?.document?.updateTime
          ? formattedDate(publication.document.updateTime)
          : null}
      </Paragraph>
    </Aside>
  ) : null
}

const Aside = styled(YStack, {
  padding: '$4',
})
