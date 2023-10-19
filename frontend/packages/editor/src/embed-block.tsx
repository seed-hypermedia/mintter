import {PartialMessage} from '@bufbuild/protobuf'
import {useAccount} from '@mintter/app/models/accounts'
import {usePublication} from '@mintter/app/models/documents'
import {useGroup} from '@mintter/app/models/groups'
import type {Account, BlockNode, Group} from '@mintter/shared'
import {BlockContentEmbed, createHmId, unpackHmId} from '@mintter/shared'
import {ErrorBlock} from '@mintter/shared/src/publication-content'
import {useMemo} from 'react'
import {ErrorBoundary} from 'react-error-boundary'
import {createReactBlockSpec} from './blocknote/react'

type LinkType = null | 'basic' | 'hypermedia'

function EmbedError() {
  return <ErrorBlock message="Failed to load this Embedded document" />
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
        <BlockContentEmbed
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
