import {trpc} from '../trpc'
import {
  Account,
  DefaultStaticBlockUnknown,
  EmbedContentAccount,
  EmbedContentGroup,
  ErrorBlock,
  Group,
  StaticBlockNode,
  StaticEmbedProps,
  StaticGroup,
  blockStyles,
  createHmId,
  getBlockNodeById,
} from '@mintter/shared'
import {SizableText, Spinner, UIAvatar, XStack, YStack} from '@mintter/ui'
import {Book} from '@tamagui/lucide-icons'
import {cidURL} from 'ipfs'
import {NextLink} from 'next-link'
import {useMemo, PropsWithChildren} from 'react'

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
