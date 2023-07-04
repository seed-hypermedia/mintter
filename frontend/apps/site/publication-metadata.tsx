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
  Avatar,
} from '@mintter/ui'
import {
  formattedDate,
  abbreviateCid,
  pluralS,
  HDTimestamp,
} from '@mintter/shared'
import {ReactElement, useEffect, useMemo, useState} from 'react'
import {toast} from 'react-hot-toast'
import {Clipboard} from '@tamagui/lucide-icons'
import {trpc} from './trpc'
import {HDChangeInfo, HDPublication} from 'server/json-hd'
import Link from 'next/link'
import {cidURL} from 'ipfs'
import {NextLink} from 'next-link'

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

export function AccountRow({
  account,
  bold,
}: {
  account?: string
  bold?: boolean
}) {
  // return <Text>{account}</Text>
  const acct = trpc.account.get.useQuery({
    accountId: account,
  })
  let profile = acct.data?.account?.profile
  let label = '?'
  if (profile && profile.alias) {
    label = profile.alias
  } else if (account) {
    label = abbreviateCid(account)
  }
  return (
    <Link href={`/a/${account}`} style={{textDecoration: 'none'}}>
      <XStack gap="$3" alignItems="center">
        <Avatar circular size={24}>
          {profile?.avatar ? (
            <Avatar.Image src={cidURL(profile.avatar)} />
          ) : null}
          <Avatar.Fallback backgroundColor={'#26ab95'} />
        </Avatar>
        <Text
          hoverStyle={{textDecorationLine: 'underline'}}
          fontWeight={bold ? 'bold' : undefined}
        >
          {label}
        </Text>
      </XStack>
    </Link>
  )
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
  const docChanges = trpc.publication.getChanges.useQuery(
    {
      documentId: publication?.document?.id,
      version: publication?.version || undefined,
    },
    {enabled: !!publication?.document?.id},
  )
  return (
    <YStack>
      <SizableText fontWeight={'bold'}>
        {pluralS(editors?.length || 0, 'Author')}:&nbsp;
      </SizableText>
      {editors
        ?.map((editor) => {
          const isMainAuthor = !!docChanges.data?.versionChanges.find(
            (change) => change?.author === editor,
          )
          if (!editor) return null
          return (
            <AccountRow account={editor} key={editor} bold={isMainAuthor} />
          )
        })
        .filter((e) => !!e)}
    </YStack>
  )
}

function DepPreview({
  dep,
  publication,
}: {
  dep: HDChangeInfo | null
  publication?: HDPublication | null
}) {
  const depTime = useFormattedTime(dep?.createTime)
  const docId = publication?.document?.id
  if (!docId || !dep) return null
  return (
    <NextLink href={`/d/${publication?.document?.id}?v=${dep.version}`}>
      <Text>{depTime}</Text>
    </NextLink>
  )
}

function VersionsMeta({publication}: {publication?: HDPublication | null}) {
  const docChanges = trpc.publication.getChanges.useQuery(
    {
      documentId: publication?.document?.id,
      version: publication?.version || undefined,
    },
    {enabled: !!publication?.document?.id},
  )
  const deps = docChanges.data?.deps

  let previousVersions: ReactElement | null = null

  if (deps?.length) {
    previousVersions = (
      <>
        <SizableText fontWeight={'bold'}>
          Previous {pluralS(deps?.length, 'Version')}:&nbsp;
        </SizableText>
        {deps?.map((dep) => (
          <DepPreview dep={dep} key={dep?.id} publication={publication} />
        ))}
      </>
    )
  }

  console.log('DOC CHANGES', docChanges.data)
  return (
    <YStack>
      {previousVersions}

      {/* <Button icon={History} size={'$2'}>
        All 4 Previous Versions
      </Button> */}

      {/* {docChanges.data?.changes?.map((change) => {
        return <Text key={change.id}>{change.id}</Text>
      })} */}
    </YStack>
  )
}

function EmbedMeta({publication}: {publication?: HDPublication | null}) {
  const embedMeta = trpc.publication.getEmbedMeta.useQuery({
    documentId: publication?.document?.id,
    versionId: publication?.version,
  })
  const embeds = embedMeta.data
  return (
    <YStack>
      <SizableText fontWeight={'bold'}>Embeds:&nbsp;</SizableText>
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
      <VersionsMeta publication={publication} />
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
