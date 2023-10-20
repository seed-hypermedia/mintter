import {
  EmbedContentAccount,
  EmbedContentGroup,
  ErrorBlock,
  BlockNodeContent,
  StaticEmbedProps,
  BlockNodeList,
  PublicationContentProvider,
  UnpackedDocId,
  UnpackedHypermediaId,
  blockStyles,
  createHmId,
  createPublicWebHmUrl,
  getBlockNodeById,
  isHypermediaScheme,
  unpackHmId,
  usePublicationContentContext,
  contentLayoutUnit,
  contentTextUnit,
} from '@mintter/shared'
import {Spinner, YStack} from '@mintter/ui'
import {NextLink} from 'src/next-link'
import {useRouter} from 'next/router'
import {PropsWithChildren, ReactNode, useMemo} from 'react'
import {trpc} from './trpc'
import {copyUrlToClipboardWithFeedback} from '@mintter/app/copy-to-clipboard'

export function SitePublicationContentProvider({
  children,
  unpackedId,
}: {
  children: ReactNode
  unpackedId: UnpackedHypermediaId | null
}) {
  const router = useRouter()
  return (
    <PublicationContentProvider
      layoutUnit={contentLayoutUnit}
      textUnit={contentTextUnit}
      debug={false}
      entityComponents={{
        AccountCard: EmbedAccount,
        GroupCard: EmbedGroup,
        PublicationCard: EmbedPublication,
      }}
      onLinkClick={(href, e) => {
        e.stopPropagation()
        const isHmHref = isHypermediaScheme(href)
        const id = unpackHmId(href)
        // if the user is pressing a modifier, the browser will open the actual link href in a new tab.
        // external links are also handled with the default browser href behavior
        // we can open parsable hypermedia links as a router push for a smoother transition.
        if (e.metaKey || e.ctrlKey || !isHmHref || !id) return
        // only in the case of hypermedia IDs do we want to explicitly push the route.
        e.preventDefault()
        const dest = createPublicWebHmUrl(id.type, id.eid, {
          version: id.version,
          hostname: null,
          blockRef: id.blockRef,
        })
        router.push(dest)
      }}
      saveCidAsFile={async (cid: string, fileName: string) => {
        const aElement = document.createElement('a')
        aElement.setAttribute('download', fileName)
        aElement.href = `/ipfs/${cid}`
        aElement.setAttribute('target', '_blank')
        aElement.click()
      }}
      onCopyBlock={(blockId: string) => {
        if (unpackedId) {
          console.log('window.location', window.location)
          copyUrlToClipboardWithFeedback(
            createPublicWebHmUrl('d', unpackedId.eid, {
              version: unpackedId.version,
              blockRef: blockId,
              hostname: window.location.origin,
            }),
            'Block',
          )
        }
      }}
      ipfsBlobPrefix="/ipfs/"
    >
      {children}
    </PublicationContentProvider>
  )
}

function EmbedWrapper(props: PropsWithChildren<{hmRef: string}>) {
  const {layoutUnit} = usePublicationContentContext()
  return (
    <NextLink
      href={stripHMLinkPrefix(props.hmRef)}
      style={{textDecoration: 'none', display: 'block', width: '100%'}}
    >
      <YStack
        {...blockStyles}
        className="block-embed"
        hoverStyle={{
          cursor: 'pointer',
          backgroundColor: '$color5',
        }}
        margin={0}
        marginHorizontal={(-1 * layoutUnit) / 2}
        width={`calc(100% + ${layoutUnit})`}
        padding={layoutUnit / 2}
        overflow="hidden"
        borderRadius={layoutUnit / 4}
      >
        {props.children}
      </YStack>
    </NextLink>
  )
}

export function EmbedPublication(props: StaticEmbedProps) {
  const docId = props.type == 'd' ? createHmId('d', props.eid) : undefined
  const pub = trpc.publication.get.useQuery(
    {
      documentId: docId,
      versionId: props.version || undefined,
    },
    {
      enabled: !!docId,
    },
  )

  const pubData = pub.data
  let embedBlocks = useMemo(() => {
    const selectedBlock =
      props.blockRef && pubData?.publication?.document?.children
        ? getBlockNodeById(
            pubData.publication?.document?.children,
            props.blockRef,
          )
        : null

    const embedBlocks = selectedBlock
      ? [selectedBlock]
      : pubData?.publication?.document?.children

    return embedBlocks
  }, [props.blockRef, pubData])

  if (pub.isLoading) return <Spinner />
  if (pub.error) return <ErrorBlock message={pub.error.message} />

  if (!docId || !embedBlocks?.length)
    return <ErrorBlock message="Failed to load this embed" />
  return (
    <EmbedWrapper hmRef={props.id}>
      {embedBlocks?.length ? (
        <BlockNodeList childrenType="group">
          {embedBlocks.map((bn, idx) => (
            <BlockNodeContent
              key={bn.block?.id}
              depth={1}
              blockNode={bn}
              childrenType="group"
              index={idx}
              embedDepth={1}
            />
          ))}
        </BlockNodeList>
      ) : (
        <ErrorBlock message="Embedded content was not found" />
      )}
    </EmbedWrapper>
  )
}

export function EmbedGroup(props: StaticEmbedProps) {
  const groupId = props.type == 'g' ? createHmId('g', props.eid) : undefined
  const groupQuery = trpc.group.get.useQuery({groupId, version: ''})

  if (groupQuery.isLoading) return <Spinner />
  if (groupQuery.error) return <ErrorBlock message={groupQuery.error.message} />
  const group = groupQuery.data?.group
  return group ? (
    <EmbedWrapper hmRef={props.id}>
      <EmbedContentGroup group={group} />
    </EmbedWrapper>
  ) : (
    <ErrorBlock message="Failed to load group embed" />
  )
}

export function EmbedAccount(props: StaticEmbedProps) {
  const accountId = props.type == 'a' ? props.eid : undefined
  const accountQuery = trpc.account.get.useQuery({accountId})
  const account = accountQuery.data?.account
  if (accountQuery.isLoading) return <Spinner />
  if (accountQuery.error)
    return <ErrorBlock message={accountQuery.error.message} />
  return account ? (
    <EmbedWrapper hmRef={props.id}>
      <EmbedContentAccount account={account} />
    </EmbedWrapper>
  ) : (
    <ErrorBlock message="Failed to account embed" />
  )
}

function stripHMLinkPrefix(link: string) {
  return link.replace(/^hm:\//, '')
}
