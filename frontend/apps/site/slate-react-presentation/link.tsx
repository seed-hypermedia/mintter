import {
  getIdsfromUrl,
  Link as LinkType,
  MINTTER_LINK_PREFIX,
} from '@mintter/shared'
import Link from 'next/link'
import {useMemo} from 'react'
import {Leaf} from '.'

type ElementLinkProps = {
  // 'data-type': string
  element: LinkType
}

export function ElementLink({element, ...props}: ElementLinkProps) {
  let url = useMemo(() => {
    if (isMintterScheme(element.url)) {
      let [docId, version, block] = getIdsfromUrl(element.url)
      if (version) {
        if (block) {
          return `/p/${docId}?v=${version}#${block}`
        } else {
          return `/p/${docId}?v=${version}`
        }
      } else {
        return `/p/${docId}`
      }
    } else {
      return null
    }
  }, [element.url])

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
