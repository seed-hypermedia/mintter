import {
  getIdsfromUrl,
  Link as LinkType,
  MINTTER_LINK_PREFIX,
} from '@mintter/shared'
import Link from 'next/link'
import {useMemo} from 'react'
import {Leaf} from '.'
import {trpc} from '../trpc'

type ElementLinkProps = {
  // 'data-type': string
  element: LinkType
}

export function ElementLink({element, ...props}: ElementLinkProps) {
  let [docId, version, block] = getIdsfromUrl(element.url)

  const pathInfo = trpc.publication.getPathInfo.useQuery(
    {
      documentId: docId,
      version,
    },
    {
      enabled: !!docId,
    },
  )
  const localPathName = pathInfo.data?.webPublications?.find((p) => !!p)?.path
  let url = useMemo(() => {
    if (docId) {
      let url = `/p/${docId}`
      if (localPathName) {
        if (localPathName === '/' || localPathName === '') url = '/'
        else url = `/${localPathName}`
      }
      if (version) {
        url += `?v=${version}`
      }
      if (block) {
        url += `#${block}`
      }
      return url
    } else {
      return null
    }
  }, [docId, version, block, localPathName])

  let children = (
    <>
      {element.children.map((child: any, i) => (
        <Leaf key={i} leaf={child} />
      ))}
    </>
  )

  return url ? (
    <Link href={url} {...props}>
      {children}
    </Link>
  ) : (
    <a href={(element as LinkType).url} {...props}>
      {children}
    </a>
  )
}

function isMintterScheme(entry: string): boolean {
  return entry.startsWith(MINTTER_LINK_PREFIX)
}
