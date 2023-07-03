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
  YStack,
  Tooltip,
} from '@mintter/ui'
import {
  formattedDate,
  abbreviateCid,
  pluralS,
  HDTimestamp,
} from '@mintter/shared'
import {useEffect, useMemo, useState} from 'react'
import {toast} from 'react-hot-toast'
import {Clipboard, History} from '@tamagui/lucide-icons'
import {trpc} from './trpc'
import {HDPublication} from 'server/json-hd'
import {format} from 'date-fns'

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

export function LoadedAccountId({account}: {account?: string}) {
  // return <Text>{account}</Text>
  const acct = trpc.account.get.useQuery({
    accountId: account,
  })
  let profile = acct.data?.account?.profile
  console.log('Loaded profile', account, profile)
  if (profile && profile.alias) {
    return <Text>{profile.alias}</Text>
  }
  if (!account) return <Text>?</Text>
  return <Text>{abbreviateCid(account)}</Text>
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

export function AuthorsMeta({
  publication,
}: {
  publication?: HDPublication | null
}) {
  if (!publication) return null
  const editors = publication?.document?.editors
  return (
    <YStack>
      <SizableText fontWeight={'bold'}>
        {pluralS(editors?.length || 0, 'Author')}:&nbsp;
      </SizableText>
      {editors
        ?.map((editor) => {
          if (!editor) return null
          return <LoadedAccountId account={editor} key={editor} />
        })
        .filter((e) => !!e)}
    </YStack>
  )
}

function VersionsMeta({publication}: {publication?: HDPublication | null}) {
  const docChanges = trpc.publication.getChanges.useQuery(
    {
      documentId: publication?.document?.id,
    },
    {enabled: !!publication?.document?.id},
  )

  return (
    <YStack>
      <SizableText fontWeight={'bold'}>Previous Version:&nbsp;</SizableText>
      <Button icon={History} size={'$2'}>
        All 4 Previous Versions
      </Button>
      {docChanges.data?.changes?.map((change) => {
        return <Text key={change.id}>{change.id}</Text>
      })}
    </YStack>
  )
}

function EmbedMeta({publication}: {publication?: HDPublication | null}) {
  return (
    <YStack>
      <SizableText fontWeight={'bold'}>Embedded Documents:&nbsp;</SizableText>
    </YStack>
  )
}

export function PublicationMetadata({
  publication,
}: {
  publication?: HDPublication | null
}) {
  let media = useMedia()
  // let size: FontSizeTokens = useMemo(() => (media.gtSm ? '$5' : '$7'), [media])
  const publishTime = useFormattedTime(publication?.document?.publishTime)
  const updateTime = useFormattedTime(publication?.document?.updateTime)
  if (!publication) return null
  const editors = publication?.document?.editors
  return (
    <>
      <PublishedMeta publication={publication} />
      <AuthorsMeta publication={publication} />
      {/* <EmbedMeta publication={publication} /> */}
      {/* <VersionsMeta publication={publication} /> */}
    </>
  )
}

export function PublishedMeta({
  publication,
}: {
  publication?: HDPublication | null
}) {
  const publishTimeRelative = useFormattedTime(
    publication?.document?.publishTime,
  )
  const publishTime = publication?.document?.publishTime
  return (
    <YStack>
      <Paragraph>
        <SizableText fontWeight={'bold'}>Published &nbsp;</SizableText>
        {publishTimeRelative}
      </Paragraph>
      {/* <SimpleTooltip content="hello">
        <Paragraph>
          {format(new Date(publishTime), 'EEEE, MMMM do, yyyy')}
        </Paragraph>
      </SimpleTooltip> */}
    </YStack>
  )
}
