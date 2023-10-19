import {
  EmbedContentAccount,
  EmbedContentGroup,
  ErrorBlock,
  StaticBlockNode,
  StaticEmbedProps,
  StaticGroup,
  StaticPublicationProvider,
  UnpackedDocId,
  UnpackedHypermediaId,
  blockStyles,
  createHmId,
  createPublicWebHmUrl,
  getBlockNodeById,
  isHypermediaScheme,
  unpackHmId,
} from '@mintter/shared'
import {Spinner, YStack} from '@mintter/ui'
import {NextLink} from 'next-link'
import {useRouter} from 'next/router'
import {PropsWithChildren, ReactNode, useMemo} from 'react'
import {trpc} from '../trpc'
import {copyUrlToClipboardWithFeedback} from '@mintter/app/copy-to-clipboard'

export function SiteStaticPublicationProvider({
  children,
  unpackedId,
}: {
  children: ReactNode
  unpackedId: UnpackedHypermediaId | null
}) {
  const router = useRouter()
  return (
    <StaticPublicationProvider
      entityComponents={{
        StaticAccount: StaticBlockAccount,
        StaticGroup: StaticBlockGroup,
        StaticPublication: StaticBlockPublication,
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
    </StaticPublicationProvider>
  )
}

function EmbedWrapper(props: PropsWithChildren<{hmRef: string}>) {
  return (
    <NextLink
      href={stripHMLinkPrefix(props.hmRef)}
      style={{textDecoration: 'none'}}
    >
      <YStack
        {...blockStyles}
        className="block-static block-embed"
        hoverStyle={{
          cursor: 'pointer',
          backgroundColor: '$color5',
        }}
        overflow="hidden"
        borderRadius="$3"
        borderWidth={1}
        borderColor="$color5"
      >
        {props.children}
      </YStack>
    </NextLink>
  )
}

export function StaticBlockPublication(props: StaticEmbedProps) {
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
        <StaticGroup childrenType="group" marginLeft="-1.5em">
          {embedBlocks.map((bn, idx) => (
            <StaticBlockNode
              key={bn.block?.id}
              depth={1}
              blockNode={bn}
              childrenType="group"
              index={idx}
              embedDepth={1}
            />
          ))}
        </StaticGroup>
      ) : (
        <ErrorBlock message="Embedded content was not found" />
      )}
    </EmbedWrapper>
  )
}

export function StaticBlockGroup(props: StaticEmbedProps) {
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

export function StaticBlockAccount(props: StaticEmbedProps) {
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
