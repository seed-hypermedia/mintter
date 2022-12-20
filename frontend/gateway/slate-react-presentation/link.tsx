import {useRef} from 'react'
import {Leaf} from '.'
import {Link} from '../mttast'

type ElementLinkProps = {
  'data-type': string
  element: Link
}

export function ElementLink({element, ...props}: ElementLinkProps) {
  let url = useRef(element.url)

  // TODO:
  return (
    <a href={(element as Link).url} {...props}>
      {element.children.map((child: any, i) => (
        <Leaf key={i} leaf={child} />
      ))}
    </a>
  )
}
