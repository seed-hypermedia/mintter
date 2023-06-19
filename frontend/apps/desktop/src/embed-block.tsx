import {BlockNode, getIdsfromUrl} from '@mintter/shared'
import {useMemo} from 'react'
import {createReactBlockSpec} from './blocknote-react'
import {usePublication} from './models/documents'

export const EmbedBlock = createReactBlockSpec({
  type: 'embedBlock',
  propSchema: {
    ref: {
      default: '',
    },
  },
  containsInlineContent: true,
  // @ts-expect-error
  atom: true,

  render: ({block}) => {
    let res = useEmbed(block.props.ref)

    return (
      <div data-ref={block.props.ref} style={{userSelect: 'none'}}>
        <span contentEditable={false}>
          {res.status == 'success' ? res.data.content ?? 'NO CONTENT' : '...'}
        </span>
      </div>
    )
  },
})

function useEmbed(ref: string) {
  // get the linked publication
  // filter the block
  // return the string
  let [documentId, versionId, blockId] = getIdsfromUrl(ref)
  let pubQuery = usePublication({
    documentId,
    versionId,
    enabled: !!documentId && !!versionId,
  })

  return useMemo(() => {
    console.log('embed query data', pubQuery.data)
    if (pubQuery.status != 'success')
      return {
        ...pubQuery,
        data: {content: undefined, publication: pubQuery.data},
      }

    if (pubQuery.data && pubQuery.data.document && blockId) {
      let blockNode = getBlockNodeById(pubQuery.data.document.children, blockId)

      //   right now we are just returning the text from the current block, but we should return all the content of it properly
      let data =
        blockNode && blockNode.block
          ? {content: blockNode.block.text, publication: pubQuery.data}
          : {content: undefined, publication: pubQuery.data}
      return {
        ...pubQuery,
        data,
      }
    }
    return {
      ...pubQuery,
      // right now we are just returning the text from the current block, but we should return all the content of it properly
      data: {content: undefined, publication: pubQuery.data},
    }
  }, [pubQuery.data])
}

function getBlockNodeById(
  blocks: Array<BlockNode>,
  blockId: string,
): BlockNode | null {
  let res: BlockNode | undefined
  for (const bn of blocks) {
    if (bn.block?.id == blockId) {
      res = bn
      return res
    } else if (bn.children.length) {
      return getBlockNodeById(bn.children, blockId)
    }
  }

  if (!res) {
    return null
  }

  console.log('=== getBlockNodeById', blockId, res)
  return res
}
