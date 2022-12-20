import {useCallback, useEffect, useRef} from 'react'
import {RenderElementProps} from 'slate-react'
import {EditorType, useSlatePresentation} from '.'
import {Embed, Link, MttastNode} from '../mttast'
import {ElementLink} from './link'
import {Paragraph} from './paragraph'
import {StaticParagraph} from './static-paragraph'
import {Transclusion} from './transclusion'

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
        return <ol {...elementProps}>{children}</ol>
      case 'statement':
        return (
          <li data-type="p" id={element.id}>
            {children}
          </li>
        )
      case 'heading':
        return (
          <li {...elementProps} id={element.id} data-level={element.data.level}>
            {children}
          </li>
        )
      case 'blockquote':
      case 'code':
        return (
          <li {...elementProps} id={element.id}>
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
      // ...
      default:
        return <span {...elementProps}>{children}</span>
    }
  }, [])
}
