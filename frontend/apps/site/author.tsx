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
import {formattedDate, abbreviateCid, pluralS} from '@mintter/shared'
import {useEffect, useMemo, useState} from 'react'
import {toast} from 'react-hot-toast'
import {Clipboard} from '@tamagui/lucide-icons'
import {trpc} from './trpc'
import {HDAccount, HDPublication, HDTimestamp} from 'server/json-hd'
import {Timestamp} from '@bufbuild/protobuf'

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
  account?: HDAccount | string | null
}) {
  const id = typeof account === 'string' ? account : account?.id
  const acct = trpc.account.get.useQuery({
    accountId: id,
  })
  if (typeof account === 'string') return <Text>{abbreviateCid(account)}</Text>
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
  return <Text>{abbreviateCid(account.id)}</Text>
}

function useInterval(ms: number) {
  const [count, setCount] = useState(0)
  useEffect(() => {
    let id = setInterval(() => setCount((c) => c + 1), ms)
    return () => clearInterval(id)
  }, [ms])
  return count
}

function useFormattedTime(
  time: string | Date | HDTimestamp | null | undefined,
) {
  const updateInterval = useInterval(10_000) // update the time every 10 seconds
  return useMemo(() => {
    updateInterval // silence react-hooks/exhaustive-deps.. the time is an implicit dependency of formattedDate
    if (typeof time === 'string') return formattedDate(time)
    if (time instanceof Date) return formattedDate(time)
    return formattedDate(time)
  }, [time, updateInterval])
}

export function PublicationMetadata({
  publication,
  editors,
}: {
  publication?: HDPublication
  editors?: (HDAccount | string | null)[]
}) {
  let media = useMedia()
  let size: FontSizeTokens = useMemo(() => (media.gtSm ? '$5' : '$7'), [media])
  const publishTime = useFormattedTime(publication?.document?.publishTime)
  const updateTime = useFormattedTime(publication?.document?.updateTime)
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
        {publishTime}
      </Paragraph>
      <Paragraph size={size}>
        <SizableText o={0.5}>Last update:&nbsp;</SizableText>
        {updateTime}
      </Paragraph>
      <IDLabelRow label="Document ID" id={publication?.document?.id} />
      <IDLabelRow label="Version ID" id={publication?.version} />
    </SiteAside>
  ) : null
}
