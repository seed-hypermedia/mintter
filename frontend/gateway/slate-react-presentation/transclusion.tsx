import Link from 'next/link'
import {visit} from 'unist-util-visit'
import {SlateReactPresentation} from '.'
import {
  Embed,
  FlowContent,
  blockNodeToSlate,
  getIdsfromUrl,
} from '@mintter/shared'
import {useRenderElement} from './render-element'
import {useRenderLeaf} from './render-leaf'
import {trpc} from '../trpc'
import {useMemo} from 'react'

function renderStandardUrl(docId: string, version?: string, block?: string) {
  let url = `/p/${docId}`
  if (version) {
    url += `?v=${version}`
  }
  if (block) {
    url += `#${block}`
  }
  return url
}

export function Transclusion({element}: {element: Embed}) {
  let renderElement = useRenderElement()
  let renderLeaf = useRenderLeaf()
  const [documentId, versionId, blockId] = useMemo(
    () => getIdsfromUrl(element.url),
    [element.url],
  )
  const doc = trpc.publication.get.useQuery(
    {
      documentId,
      versionId,
    },
    {},
  )
  const block = useMemo(() => {
    const docChildren = doc.data?.children
    if (docChildren) {
      let pubContent = blockNodeToSlate(docChildren, 'group')
      let temp: FlowContent | undefined
      visit(
        {
          type: 'root',
          children: pubContent.children,
        },
        {id: blockId},
        (node) => {
          temp = node
        },
      )
      if (temp) {
        return temp as FlowContent
      }
    }
  }, [doc.data, blockId])
  if (!block) return null
  return (
    <Link href={renderStandardUrl(documentId, versionId, blockId)}>
      <q>
        <SlateReactPresentation
          type="transclusion"
          value={block.children}
          renderElement={renderElement}
          renderLeaf={renderLeaf}
        />
      </q>
    </Link>
  )
}
