import {PartialMessage} from '@bufbuild/protobuf'
import {usePublication} from '@mintter/app/models/documents'
import {useOpenUrl} from '@mintter/app/open-url'
import {NavRoute, unpackHmIdWithAppRoute} from '@mintter/app/utils/navigation'
import {useNavigate} from '@mintter/app/utils/useNavigate'
import type {
  Account,
  BlockNode,
  Group,
  HMBlockChildrenType,
  Block as ServerBlock,
} from '@mintter/shared'
import {
  BACKEND_FILE_URL,
  Block,
  StaticBlockEmbed,
  createHmId,
  fromHMBlock,
  getCIDFromIPFSUrl,
  isHypermediaScheme,
  toHMBlock,
  unpackHmId,
} from '@mintter/shared'
import {
  FontSizeTokens,
  SizableText,
  Spinner,
  Text,
  UIAvatar,
  XStack,
  YStack,
} from '@mintter/ui'
import {AlertCircle, Book} from '@tamagui/lucide-icons'
import {useMemo} from 'react'
import {ErrorBoundary} from 'react-error-boundary'
import {useSelected} from './block-utils'
import {
  Block as BlockNoteBlock,
  BlockNoteEditor,
  InlineContent,
} from './blocknote'
import {createReactBlockSpec} from './blocknote/react'

import {useAccount} from '@mintter/app/models/accounts'
import {useGroup} from '@mintter/app/models/groups'
import {getAvatarUrl} from '@mintter/app/utils/account-url'
import {hmBlockSchema} from './schema'

type LinkType = null | 'basic' | 'hypermedia'

function hmTextColor(linkType: LinkType): string {
  if (linkType === 'basic') return '$blue11'
  if (linkType === 'hypermedia') return '$mint11'
  return '$color12'
}

function EmbedError() {
  return (
    <XStack
      contentEditable={false}
      userSelect="none"
      backgroundColor="$red5"
      borderColor="$red8"
      borderWidth={1}
      padding="$4"
      paddingVertical="$2"
      borderRadius="$4"
      gap="$2"
    >
      <AlertCircle size={18} color="$red10" />
      <Text>Failed to load this Embedded document</Text>
    </XStack>
  )
}
export const EmbedBlock = createReactBlockSpec({
  type: 'embed',
  propSchema: {
    ref: {
      default: '',
    },
  },
  containsInlineContent: true,

  render: ({block, editor}) => {
    return (
      <ErrorBoundary FallbackComponent={EmbedError}>
        <StaticBlockEmbed
          block={{
            id: block.id,
            type: 'embed',
            text: '',
            attributes: {
              childrenType: 'group',
            },
            annotations: [],
            ref: block.props.ref,
          }}
          blockRef={block.props.ref}
          depth={1}
        />
      </ErrorBoundary>
    )
  },
})

function useEmbed(ref: string): {
  isLoading: boolean
  embedBlocks: (BlockNode[] & PartialMessage<BlockNode>[]) | undefined
  group: Group | undefined
  account: Account | undefined
} {
  const id = unpackHmId(ref)
  const docId = id?.type === 'd' ? createHmId('d', id?.eid) : undefined
  let pubQuery = usePublication({
    documentId: docId,
    versionId: id?.version || undefined,
    enabled: !!docId,
  })
  const groupId = id?.type === 'g' ? createHmId('g', id?.eid) : undefined
  const groupQuery = useGroup(groupId, id?.version || undefined)
  const accountId = id?.type === 'a' ? id?.eid : undefined
  const accountQuery = useAccount(accountId)
  return useMemo(() => {
    const data = pubQuery.data

    const selectedBlock =
      id?.blockRef && data?.document?.children
        ? getBlockNodeById(data.document.children, id?.blockRef)
        : null

    const embedBlocks = selectedBlock
      ? [selectedBlock]
      : data?.document?.children

    return {
      isLoading:
        pubQuery.isLoading || accountQuery.isLoading || groupQuery.isLoading,
      error: pubQuery.error || accountQuery.error || groupQuery.error,
      embedBlocks,
      account: accountQuery.data,
      group: groupQuery.data,
    }
  }, [pubQuery, accountQuery, groupQuery, id?.blockRef])
}

function getBlockNodeById(
  blocks: Array<BlockNode>,
  blockId: string,
): BlockNode | null {
  if (!blockId) return null

  let res: BlockNode | undefined
  blocks.find((bn) => {
    if (bn.block?.id == blockId) {
      res = bn
      return true
    } else if (bn.children.length) {
      const foundChild = getBlockNodeById(bn.children, blockId)
      if (foundChild) {
        res = foundChild
        return true
      }
    }
    return false
  })
  return res || null
}
