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
  Avatar,
} from '@mintter/ui'
import {
  Publication,
  formattedDate,
  Account,
  abbreviateCid,
  pluralS,
} from '@mintter/shared'
import {useMemo} from 'react'
import {toast} from 'react-hot-toast'
import {Clipboard} from '@tamagui/lucide-icons'
import {trpc} from './trpc'

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

export function LoadedAccountId({
  account,
}: {
  account?: Account | string | null
}) {
  const id = typeof account === 'string' ? account : account?.id
  const acct = trpc.account.get.useQuery({
    accountId: id,
  })
  let profile = acct.data?.account?.profile || account?.profile
  if (profile) {
    // todo avatar!
    return (
      <>
        <Text>{profile.alias}</Text>
      </>
    )
  }
  if (!account) return <Text>?</Text>
  if (typeof account === 'string') return <Text>{abbreviateCid(account)}</Text>
  return <Text>{abbreviateCid(account.id)}</Text>
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
      <SizableText opacity={0.5}>
        {pluralS(editors?.length || 0, 'Author')}:&nbsp;
      </SizableText>
      {editors
        ?.map((editor) => {
          if (!editor) return null
          return (
            <LoadedAccountId
              account={editor}
              key={typeof editor === 'string' ? editor : editor.id}
            />
          )
        })
        .filter((e) => !!e)}
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
