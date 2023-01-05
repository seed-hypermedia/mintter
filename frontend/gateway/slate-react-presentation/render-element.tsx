import {useCallback, useEffect, useRef} from 'react'
import {RenderElementProps} from 'slate-react'
import {
  Code,
  Embed,
  Image,
  Link,
  MttastNode,
  Video as VideoType,
} from '../mttast'
import {ElementLink} from './link'
import {Paragraph} from './paragraph'
import {StaticParagraph} from './static-paragraph'
import {Transclusion} from './transclusion'
import {Video} from './video'

let firstHeading = true

export function useRenderElement() {
  return useCallback(({children, element, attributes}: RenderElementProps) => {
    let elementProps = {
      'data-type': element.type,
    }

    switch ((element as MttastNode).type) {
      case 'group':
        return <ul {...elementProps}>{children}</ul>
      case 'unorderedList':
        return <ul {...elementProps}>{children}</ul>
      case 'orderedList':
        return (
          <ol {...elementProps} start={element.start || '1'}>
            {children}
          </ol>
        )
      case 'statement':
        return (
          <li data-type="p" id={element.id}>
            {children}
          </li>
        )
      case 'heading':
        return (
          <li
            {...elementProps}
            id={element.id}
            data-level={element.data?.level || '2'}
          >
            {children}
          </li>
        )
      case 'blockquote':
        return (
          <li {...elementProps} id={element.id}>
            {children}
          </li>
        )
      case 'code':
        return (
          <li {...elementProps} id={element.id} lang={(element as Code).lang}>
            {children}
          </li>
        )
      case 'paragraph':
        return (
          <Paragraph {...elementProps} element={element}>
            {children}
          </Paragraph>
        )
      case 'staticParagraph':
        return <StaticParagraph {...elementProps}>{children}</StaticParagraph>
      case 'embed':
        return <Transclusion element={element as Embed} />
      case 'link':
        return <ElementLink element={element as Link} {...elementProps} />
      case 'image':
        return <img src={(element as Image).url} alt={(element as Image).alt} />
      case 'video':
        return <Video element={element as VideoType} />
      // ...
      default:
        return <span {...elementProps}>{children}</span>
    }
  }, [])
}
