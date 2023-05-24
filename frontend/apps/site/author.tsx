import {
  Paragraph,
  Text,
  useMedia,
  FontSizeTokens,
  SiteAside,
  SizableText,
  Button,
  XStack,
  SimpleTooltip,
} from '@mintter/ui'
import {
  Publication,
  formattedDate,
  Account,
  abbreviateCid,
} from '@mintter/shared'
import {useMemo} from 'react'
import {toast} from 'react-hot-toast'
import {Clipboard} from '@tamagui/lucide-icons'

function IDLabelRow({id, label}: {id?: string; label: string}) {
  if (!id) return null
  return (
    <XStack>
      <SizableText o={0.5}>{label}:&nbsp;</SizableText>
      <SimpleTooltip
        content={
          <>
            <Clipboard size={12} /> Copy: {id}
          </>
        }
      >
        <Button
          size="$2"
          chromeless
          onPress={() => {
            window.navigator.clipboard.writeText(id)
            toast.success(`Copied ${label}`)
          }}
        >
          {abbreviateCid(id)}
        </Button>
      </SimpleTooltip>
    </XStack>
  )
}

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
      <IDLabelRow label="Document ID" id={publication?.document?.id} />
      <IDLabelRow label="Version ID" id={publication?.version} />
    </SiteAside>
  ) : null
}
