import {
  abbreviateCid,
  createPublicWebHmUrl,
  formattedDate,
  HMTimestamp,
  idToUrl,
  pluralS,
  unpackDocId,
} from '@mintter/shared'
import {
  Button,
  SideSection,
  SideSectionTitle,
  SizableText,
  Tooltip,
  XStack,
  YStack,
} from '@mintter/ui'
import {ChevronDown, ChevronUp, Clipboard} from '@tamagui/lucide-icons'
import {AccountRow} from 'components/account-row'
import {format} from 'date-fns'
import {NextLink} from 'next-link'
import {ReactElement, useEffect, useMemo, useState} from 'react'
import {toast} from 'react-hot-toast'
import {HMBlockNode, HMChangeInfo, HMLink, HMPublication} from 'server/json-hm'
import {trpc} from './trpc'

function IDLabelRow({id, label}: {id?: string; label: string}) {
  if (!id) return null
  return (
    <XStack>
      <SizableText opacity={0.5}>{label}:&nbsp;</SizableText>
      <Tooltip
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
      </Tooltip>
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
  time: string | Date | HMTimestamp | null | undefined,
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
  publication?: HMPublication | null
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
    <SideSection>
      <SideSectionTitle>
        {pluralS(editors?.length || 0, 'Author')}:&nbsp;
      </SideSectionTitle>
      {editors
        ?.map((editor) => {
          const isMainAuthor = !!docChanges.data?.versionChanges.find(
            (change) => change?.author === editor,
          )
          if (!editor) return null
          return (
            <AccountRow
              account={editor}
              key={editor}
              isMainAuthor={isMainAuthor}
            />
          )
        })
        .filter((e) => !!e)}
    </SideSection>
  )
}

function DepPreview({
  dep,
  publication,
  displayAuthor = false,
  pathName,
}: {
  dep: HMChangeInfo | null
  publication?: HMPublication | null
  displayAuthor?: boolean
  pathName?: string
}) {
  const createTime = dep?.createTime
  const depTime =
    createTime && format(new Date(createTime), 'd MMMM yyyy • HH:mm')
  const docId = publication?.document?.id
  if (!docId || !dep) return null
  const docIds = unpackDocId(docId)
  if (!docIds?.eid) return null
  return (
    <NextLink
      href={createPublicWebHmUrl('d', docIds?.eid, {
        version: dep?.version,
        hostname: null,
      })}
      style={{textDecoration: 'none'}}
    >
      {displayAuthor ? (
        <AccountRow account={dep.author} key={dep.author} clickable={false} />
      ) : null}
      <SizableText size="$2" paddingLeft={28}>
        {depTime}
      </SizableText>
    </NextLink>
  )
}

function NextVersionsMeta({
  publication,
  pathName,
}: {
  publication?: HMPublication | null
  pathName?: string
}) {
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
    <SideSection>
      <SideSectionTitle>
        Next {pluralS(downstreamChanges?.length, 'Version')}:&nbsp;
      </SideSectionTitle>
      <YStack gap="$2">
        {downstreamChanges?.map((dep) => (
          <DepPreview
            dep={dep}
            key={dep?.id}
            publication={publication}
            pathName={pathName}
            displayAuthor
          />
        ))}
      </YStack>
    </SideSection>
  )
}

function VersionsMeta({
  publication,
  pathName,
}: {
  publication?: HMPublication | null
  pathName?: string
}) {
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
          pathName={pathName}
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
        pathName={pathName}
        displayAuthor={prevAuthor !== dep.author}
      />,
    )
    prevContextAuthor = dep.author
  })

  if (depsCount === 0) {
    return (
      <SideSection>
        <SideSectionTitle>First Version</SideSectionTitle>
      </SideSection>
    )
  }

  const seeAllButton = hasMore ? (
    <Button
      size="$1"
      onPress={() => {
        setIsCollapsed(false)
      }}
      icon={ChevronDown}
      chromeless
      circular
    />
  ) : null

  return (
    <SideSection>
      <XStack alignItems="center">
        <SideSectionTitle flex={1}>
          {allDepsCount} Previous Versions:&nbsp;
        </SideSectionTitle>
        {isCollapsed ? (
          seeAllButton
        ) : (
          <Button
            size="$1"
            chromeless
            circular
            onPress={() => {
              setIsCollapsed(true)
            }}
            icon={ChevronUp}
          />
        )}
      </XStack>
      {previousVersionsContent}
      {!isCollapsed && allVersionsContent}
    </SideSection>
  )
}

type EmbedRef = {ref: string; blockId: string}

function surfaceEmbedRefs(children?: HMBlockNode[]): EmbedRef[] {
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
  const urlId = unpackDocId(url)
  const pub = trpc.publication.get.useQuery(
    {
      documentId: urlId?.docId,
      versionId: urlId?.version,
    },
    {
      enabled: !!urlId,
    },
  )
  if (!urlId?.eid) return null
  return (
    <NextLink
      href={createPublicWebHmUrl('d', urlId.eid, urlId)}
      style={{textDecoration: 'none'}}
    >
      <XStack
        gap="$2"
        padding="$2"
        borderRadius="$3"
        borderColor="$color6"
        borderWidth={1}
      >
        <SizableText size="$3" fontWeight="800" flex={1}>
          {pub.data?.publication?.document?.title}
        </SizableText>
        <XStack gap="-$2">
          {pub.data?.publication?.document?.editors?.map((editor) => (
            <AccountRow
              key={editor}
              account={editor}
              clickable={false}
              onlyAvatar
            />
          ))}
        </XStack>
      </XStack>
    </NextLink>
  )
}

function EmbedMeta({publication}: {publication?: HMPublication | null}) {
  const embedRefs = useMemo(() => {
    return surfaceEmbedRefs(publication?.document?.children)
  }, [publication?.document?.children])
  if (!embedRefs.length) return null
  return (
    <SideSection>
      <SideSectionTitle>Featuring:&nbsp;</SideSectionTitle>
      <YStack gap="$2">
        {embedRefs.map((embedRef) => (
          <EmbeddedDocMeta
            blockId={embedRef.blockId}
            url={embedRef.ref}
            key={embedRef.ref}
          />
        ))}
      </YStack>
    </SideSection>
  )
}

function CitationPreview({citationLink}: {citationLink: HMLink}) {
  const {source} = citationLink
  const sourcePub = trpc.publication.get.useQuery(
    {
      documentId: source?.documentId,
      versionId: source?.version,
    },
    {enabled: !!source?.documentId},
  )
  if (!sourcePub.data) return null
  if (!source?.documentId) return null
  const destUrl = idToUrl(
    source?.documentId,
    null,
    source?.version,
    source?.blockId,
  )
  if (!destUrl) return null
  return (
    <NextLink href={destUrl} style={{textDecoration: 'none'}} prefetch>
      <SizableText hoverStyle={{backgroundColor: '$backgroundColor'}}>
        {sourcePub.data?.publication?.document?.title}
      </SizableText>
    </NextLink>
  )
}
function CitationsMeta({
  publication,
}: {publication?: HMPublication | null} = {}) {
  const citations = trpc.publication.getCitations.useQuery(
    {
      documentId: publication?.document?.id,
    },
    {
      enabled: !!publication?.document?.id,
    },
  )
  if (!citations.data?.citationLinks?.length) return null
  const content = citations.data?.citationLinks
    ?.map((link) => {
      if (!link) return false
      const {source, target} = link
      return (
        <CitationPreview
          key={`${source?.documentId}-${source?.version}-${source?.blockId}-${target?.documentId}-${target?.version}-${target?.blockId}`}
          citationLink={link}
        />
      )
    })
    .filter(Boolean)
  if (content.length === 0) return null
  return (
    <SideSection>
      <SideSectionTitle>Citations:</SideSectionTitle>
      <YStack gap="$2">{content}</YStack>
    </SideSection>
  )
}

type SectionHeading = {
  title?: string
  blockId: string
  children: SectionHeading[]
}

function TOCHeading({heading}: {heading: SectionHeading}) {
  return (
    <>
      {heading.title && (
        <NextLink href={`#${heading.blockId}`} style={{textDecoration: 'none'}}>
          <SizableText size="$2" color="$blue11" fontWeight="600">
            {heading.title}
          </SizableText>
        </NextLink>
      )}
      <YStack paddingLeft="$3">
        {heading.children.map((child) => (
          <TOCHeading heading={child} key={child.blockId} />
        ))}
      </YStack>
    </>
  )
}

function getToc(blockNodes?: HMBlockNode[] | null): SectionHeading[] {
  if (!blockNodes) return []
  let headings: SectionHeading[] = []
  for (let blockNode of blockNodes) {
    if (blockNode.block?.type === 'heading') {
      headings.push({
        title: blockNode.block?.text || '',
        blockId: blockNode.block?.id || '',
        children: getToc(blockNode.children),
      })
    } else if (blockNode.children) {
      headings.push({
        blockId: blockNode.block?.id || '',
        children: getToc(blockNode.children),
      })
    }
  }
  return headings
}

export function TableOfContents({
  publication,
}: {publication?: HMPublication | null} = {}) {
  const toc = useMemo(
    () => getToc(publication?.document?.children),
    [publication],
  )
  if (!toc || !toc.length) return null
  return (
    <SideSection>
      <SideSectionTitle>Containing:</SideSectionTitle>
      {toc?.map((heading) => (
        <TOCHeading heading={heading} key={heading.blockId} />
      ))}
    </SideSection>
  )
}

export function PublicationMetadata({
  publication,
  pathName,
}: {
  publication?: HMPublication | null
  pathName?: string
}) {
  if (!publication) return null
  return (
    <>
      <TableOfContents publication={publication} />
      <PublishedMeta publication={publication} pathName={pathName} />
      <AuthorsMeta publication={publication} />
      <EmbedMeta publication={publication} />
      <NextVersionsMeta publication={publication} pathName={pathName} />
      <VersionsMeta publication={publication} pathName={pathName} />
      <CitationsMeta publication={publication} />
    </>
  )
}

function LatestVersionBanner({
  record,
  pathName,
}: {
  record: {
    versionId: string
    documentId: string
    publishTime: string
  }
  pathName: string
}) {
  const publishTimeRelative = useFormattedTime(record?.publishTime, true)
  if (!pathName || !record) return null

  const docId = unpackDocId(record.documentId)
  if (!docId?.eid) return null

  return (
    <NextLink
      href={createPublicWebHmUrl('d', docId?.eid, {
        version: record.versionId,
        hostname: null,
      })}
      style={{textDecoration: 'none'}}
    >
      <SideSectionTitle>Latest Version:&nbsp;</SideSectionTitle>
      <SizableText textDecorationLine="underline" color="$blue11">
        {publishTimeRelative}
      </SizableText>

      <Tooltip
        content={format(
          new Date(record.publishTime),
          'MMMM do yyyy, HH:mm:ss z',
        )}
      >
        <SizableText color="$blue11">
          {format(new Date(record.publishTime), 'EEEE, MMMM do, yyyy')}
        </SizableText>
      </Tooltip>
    </NextLink>
  )
}

export function PublishedMeta({
  publication,
  pathName,
}: {
  publication?: HMPublication | null
  pathName?: string
}) {
  // const pathRecord = trpc.publication.getPath.useQuery(
  //   {pathName},
  //   {enabled: !!pathName},
  // )
  const publishTime = publication?.document?.publishTime
  const publishTimeRelative = useFormattedTime(publishTime, true)

  const publishTimeDate = publishTime && new Date(publishTime)
  let latestVersion: null | ReactElement = null
  // const {documentId: pathDocId, versionId: pathVersionId} =
  //   pathRecord.data || {}
  // if (
  //   pathName &&
  //   pathRecord.data &&
  //   pathRecord &&
  //   publication &&
  //   pathDocId &&
  //   pathVersionId &&
  //   (pathDocId !== publication.document?.id ||
  //     pathVersionId !== publication.version)
  // ) {
  //   latestVersion = (
  //     <LatestVersionBanner pathName={pathName} record={pathRecord.data} />
  //   )
  // }

  return (
    <SideSection>
      <SideSectionTitle>Published:</SideSectionTitle>
      <SizableText size="$3" fontWeight="800">
        <NextLink
          href={createPublicWebHmUrl(
            'd',
            unpackDocId(publication?.document?.id || '')?.eid || '',
            {
              hostname: null,
              version: publication?.version || '',
            },
          )}
        >
          {publishTimeRelative}{' '}
          {publishTimeDate && (
            <SizableText size="$1" opacity={0.5}>
              ( {format(publishTimeDate, 'EEEE, MMMM do, yyyy')} )
            </SizableText>
          )}
        </NextLink>
      </SizableText>
      {latestVersion}
    </SideSection>
  )
}
