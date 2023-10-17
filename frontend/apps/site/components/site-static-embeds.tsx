import {trpc} from '../trpc'
import {
  Account,
  DefaultStaticBlockUnknown,
  Group,
  StaticBlockNode,
  StaticEmbedProps,
  StaticGroup,
  blockStyles,
  createHmId,
  getBlockNodeById,
} from '@mintter/shared'
import {SizableText, UIAvatar, XStack, YStack} from '@mintter/ui'
import {Book} from '@tamagui/lucide-icons'
import {cidURL} from 'ipfs'
import {NextLink} from 'next-link'
import {useRouter} from 'next/router'
import {useMemo, PropsWithChildren} from 'react'

function EmbedWrapper(props: PropsWithChildren<{hmRef: string}>) {
  return (
    <NextLink href={stripHMLinkPrefix(props.hmRef)}>
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

  let embedData = useMemo(() => {
    const {data} = pub

    const selectedBlock =
      props.blockRef && data?.publication?.document?.children
        ? getBlockNodeById(data.publication?.document.children, props.blockRef)
        : null

    const embedBlocks = selectedBlock
      ? [selectedBlock]
      : data?.publication?.document?.children

    return {
      ...pub,
      data: {
        publication: pub.data,
        embedBlocks,
      },
    }
  }, [props.blockRef, pub])

  return (
    <EmbedWrapper hmRef={props.id}>
      {embedData.data.embedBlocks?.length ? (
        <StaticGroup childrenType="group" marginLeft="-1.5em">
          {embedData.data.embedBlocks.map((bn, idx) => (
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
        <DefaultStaticBlockUnknown {...props} />
      )}
    </EmbedWrapper>
  )
}

export function StaticBlockGroup(props: StaticEmbedProps) {
  const groupId = props.type == 'g' ? createHmId('g', props.eid) : undefined
  const groupQuery = trpc.group.get.useQuery({groupId, version: ''})

  return groupQuery.status == 'success' ? (
    <EmbedWrapper hmRef={props.id}>
      <XStack gap="$3" padding="$4" alignItems="flex-start">
        <XStack paddingVertical="$3">
          <Book size={36} />
        </XStack>
        <YStack justifyContent="center" flex={1}>
          <SizableText size="$1" opacity={0.5} flex={0}>
            Group
          </SizableText>
          <YStack gap="$2">
            <SizableText size="$6" fontWeight="bold">
              {groupQuery.data?.group?.title}
            </SizableText>
            <SizableText size="$2">
              {groupQuery.data.group?.description}
            </SizableText>
          </YStack>
        </YStack>
      </XStack>
    </EmbedWrapper>
  ) : null
}

export function StaticBlockAccount(props: StaticEmbedProps) {
  const accountId = props.type == 'a' ? props.eid : undefined
  const accountQuery = trpc.account.get.useQuery({accountId})

  return accountQuery.status == 'success' ? (
    <EmbedWrapper hmRef={props.id}>
      <XStack gap="$3" padding="$4" alignItems="flex-start">
        <XStack paddingVertical="$3">
          <UIAvatar
            id={accountQuery.data.account?.id}
            size={36}
            label={accountQuery.data.account?.profile?.alias}
            url={
              accountQuery.data.account?.profile?.avatar
                ? cidURL(accountQuery.data.account?.profile?.avatar)
                : undefined
            }
          />
        </XStack>
        <YStack justifyContent="center" flex={1}>
          <SizableText size="$1" opacity={0.5} flex={0}>
            Account
          </SizableText>
          <YStack gap="$2">
            <SizableText size="$6" fontWeight="bold">
              {accountQuery.data?.account?.profile?.alias}
            </SizableText>
            <SizableText size="$2">
              {accountQuery.data.account?.profile?.bio}
            </SizableText>
          </YStack>
        </YStack>
      </XStack>
    </EmbedWrapper>
  ) : null
}

function stripHMLinkPrefix(link: string) {
  return link.replace(/^hm:\//, '')
}
