import {
  Paragraph,
  Text,
  SizableText,
  Button,
  XStack,
  SimpleTooltip,
  YStack,
} from '@mintter/ui'
import {
  formattedDate,
  abbreviateCid,
  pluralS,
  HDTimestamp,
  getIdsfromUrl,
} from '@mintter/shared'
import {ReactElement, useEffect, useMemo, useState} from 'react'
import {toast} from 'react-hot-toast'
import {ChevronDown, ChevronUp, Clipboard} from '@tamagui/lucide-icons'
import {trpc} from './trpc'
import {HDBlockNode, HDChangeInfo, HDPublication} from 'server/json-hd'
import Link from 'next/link'
import {format} from 'date-fns'
import {AccountRow} from 'components/account-row'
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
  onlyRelative?: boolean,
) {
  const updateInterval = useInterval(10_000) // update the time every 10 seconds
  return useMemo(() => {
    const opts = {onlyRelative}
    updateInterval // silence react-hooks/exhaustive-deps.. the time is an implicit dependency of formattedDate
    if (typeof time === 'string') return formattedDate(time, opts)
    if (time instanceof Date) return formattedDate(time, opts)
    return formattedDate(time, opts)
  }, [time, updateInterval, onlyRelative])
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
    <YStack gap="$2">
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
  displayAuthor = false,
}: {
  dep: HDChangeInfo | null
  publication?: HDPublication | null
  displayAuthor?: boolean
}) {
  const createTime = dep?.createTime
  const depTime =
    createTime && format(new Date(createTime), 'd MMMM yyyy • HH:mm')
  const docId = publication?.document?.id
  if (!docId || !dep) return null
  return (
    <NextLink
      href={`/d/${publication?.document?.id}?v=${dep.version}`}
      style={{textDecoration: 'none'}}
    >
      {displayAuthor ? (
        <AccountRow account={dep.author} key={dep.author} clickable={false} />
      ) : null}
      <Text paddingLeft={37}>{depTime}</Text>
    </NextLink>
  )
}

function NextVersionsMeta({publication}: {publication?: HDPublication | null}) {
  const docChanges = trpc.publication.getChanges.useQuery(
    {
      documentId: publication?.document?.id,
      version: publication?.version || undefined,
    },
    {enabled: !!publication?.document?.id},
  )
  const downstreamChanges = docChanges.data?.downstreamChanges
  if (!downstreamChanges?.length) return null
  return (
    <>
      <SizableText fontWeight={'bold'}>
        Next {pluralS(downstreamChanges?.length, 'Version')}:&nbsp;
      </SizableText>
      {downstreamChanges?.map((dep) => (
        <DepPreview
          dep={dep}
          key={dep?.id}
          publication={publication}
          displayAuthor
        />
      ))}
    </>
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
  const [isCollapsed, setIsCollapsed] = useState(true)
  const directDeps = docChanges.data?.deps
  const allDeps = docChanges.data?.allDeps

  let prevContextAuthor: string | null = null

  let previousVersionsContent: ReactElement[] = []

  const depsCount = directDeps?.length || 0
  const allDepsCount = allDeps?.length || 0
  const directDepsId = new Set(directDeps?.map((dep) => dep?.id))
  const restDeps = allDeps?.filter((dep) => !directDepsId.has(dep?.id))
  let hasMore = false
  if (directDeps) {
    directDeps?.forEach((dep) => {
      if (!dep?.author) return
      previousVersionsContent.push(
        <DepPreview
          dep={dep}
          key={dep?.id}
          publication={publication}
          displayAuthor={prevContextAuthor !== dep?.author}
        />,
      )
      prevContextAuthor = dep?.author
    })
  }

  const allVersionsContent: ReactElement[] = []

  restDeps?.forEach((dep) => {
    hasMore = true
    if (!dep?.author) return
    const prevAuthor = prevContextAuthor
    allVersionsContent.push(
      <DepPreview
        dep={dep}
        key={dep.id}
        publication={publication}
        displayAuthor={prevAuthor !== dep.author}
      />,
    )
    prevContextAuthor = dep.author
  })

  if (depsCount === 0) {
    return (
      <YStack gap="$2">
        <SizableText fontWeight={'bold'}>First Version</SizableText>
      </YStack>
    )
  }

  const seeAllButton = hasMore ? (
    <Button
      size="$1"
      onPress={() => {
        setIsCollapsed(false)
      }}
      icon={ChevronDown}
    >
      See All
    </Button>
  ) : null

  return (
    <YStack gap="$2">
      <SizableText fontWeight={'bold'}>
        {allDepsCount} Previous Versions:&nbsp;
      </SizableText>
      {previousVersionsContent}
      {isCollapsed ? (
        seeAllButton
      ) : (
        <>
          {allVersionsContent}
          <Button
            size="$1"
            onPress={() => {
              setIsCollapsed(true)
            }}
            icon={ChevronUp}
          ></Button>
        </>
      )}
    </YStack>
  )
}

type EmbedRef = {ref: string; blockId: string}

function surfaceEmbedRefs(children?: HDBlockNode[]): EmbedRef[] {
  if (!children) return []
  let refs: EmbedRef[] = []
  for (let child of children) {
    const ref = child.block?.ref
    const blockId = child.block?.id
    if (ref && blockId && child.block?.type === 'embed') {
      refs.push({
        ref,
        blockId,
      })
    } else if (child.children) {
      refs = refs.concat(surfaceEmbedRefs(child.children))
    }
  }
  return refs
}

function EmbeddedDocMeta({blockId, url}: {blockId: string; url: string}) {
  const [docId, versionId, refBlockId] = getIdsfromUrl(url)
  const pub = trpc.publication.get.useQuery(
    {
      documentId: docId,
      versionId,
    },
    {
      enabled: !!docId,
    },
  )
  if (!docId) return null
  return (
    <NextLink
      href={getDocUrl(docId, versionId, refBlockId)}
      style={{textDecoration: 'none'}}
    >
      <YStack gap="$2">
        <Text fontWeight={'bold'}>
          {pub.data?.publication?.document?.title}
        </Text>
        {pub.data?.publication?.document?.editors?.map((editor) => (
          <AccountRow key={editor} account={editor} clickable={false} />
        ))}
      </YStack>
    </NextLink>
  )
}

function EmbedMeta({publication}: {publication?: HDPublication | null}) {
  const embedRefs = useMemo(() => {
    return surfaceEmbedRefs(publication?.document?.children)
  }, [publication?.document?.children])
  if (!embedRefs.length) return null
  return (
    <YStack>
      <SizableText>Featuring:&nbsp;</SizableText>
      <YStack gap="$2">
        {embedRefs.map((embedRef) => (
          <EmbeddedDocMeta
            blockId={embedRef.blockId}
            url={embedRef.ref}
            key={embedRef.ref}
          />
        ))}
      </YStack>
    </YStack>
  )
}

export function PublicationMetadata({
  publication,
}: {
  publication?: HDPublication | null
}) {
  if (!publication) return null
  return (
    <>
      <PublishedMeta publication={publication} />
      <AuthorsMeta publication={publication} />
      <EmbedMeta publication={publication} />
      <NextVersionsMeta publication={publication} />
      <VersionsMeta publication={publication} />
    </>
  )
}

function getDocUrl(docId: string, versionId?: string, blockRef?: string) {
  // todo centralize this url creation logic better
  let url = `/d/${docId}`
  if (versionId) url += `?v=${versionId}`
  if (blockRef) url += `#${blockRef}`
  return url
}

export function PublishedMeta({
  publication,
}: {
  publication?: HDPublication | null
}) {
  const publishTimeRelative = useFormattedTime(
    publication?.document?.publishTime,
    true,
  )
  const publishTime = publication?.document?.publishTime
  const publishTimeDate = publishTime && new Date(publishTime)
  return (
    <YStack>
      <Paragraph>
        <SizableText fontWeight={'bold'}>Published &nbsp;</SizableText>
        <NextLink
          href={getDocUrl(
            publication?.document?.id || '',
            publication?.version || '',
          )}
        >
          {publishTimeRelative}
        </NextLink>
      </Paragraph>
      {publishTimeDate && (
        <SimpleTooltip
          content={format(publishTimeDate, 'MMMM do yyyy, HH:mm:ss z')}
        >
          <Paragraph>
            {format(publishTimeDate, 'EEEE, MMMM do, yyyy')}
          </Paragraph>
        </SimpleTooltip>
      )}
    </YStack>
  )
}
