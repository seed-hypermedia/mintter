import {
  Paragraph,
  Text,
  useMedia,
  FontSizeTokens,
  SiteAside,
  SizableText,
} from '@mintter/ui'
import {Publication, formattedDate, Account} from '@mintter/shared'
import {useMemo} from 'react'

export function PublicationMetadata({
  publication,
  editors,
}: {
  publication?: Publication
  editors?: (Account | string | null)[]
}) {
  let media = useMedia()
  let size: FontSizeTokens = useMemo(() => (media.gtSm ? '$5' : '$7'), [media])
  return publication ? (
    <SiteAside>
      <Paragraph size={size}>
        <SizableText opacity={0.5}>author:&nbsp;</SizableText>
        {editors
          ?.map((editor) => {
            if (typeof editor === 'string') return editor
            if (editor?.profile?.alias) return editor.profile.alias
            return '?'
          })
          .filter((e) => !!e)
          .join(', ')}
      </Paragraph>
      <Paragraph size={size}>
        <SizableText o={0.5}>Published at:&nbsp;</SizableText>
        {publication?.document?.publishTime
          ? formattedDate(publication.document.publishTime)
          : null}
      </Paragraph>
      <Paragraph size={size}>
        <SizableText o={0.5}>Last update:&nbsp;</SizableText>
        {publication?.document?.updateTime
          ? formattedDate(publication.document.updateTime)
          : null}
      </Paragraph>
    </SiteAside>
  ) : null
}
