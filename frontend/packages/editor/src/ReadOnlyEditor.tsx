import React from 'react'
import {SlateReactPresentation} from 'slate-react-presentation'
import {ELEMENT_PARAGRAPH} from './elements/defaults'

export function ReadOnlyEditor({value}) {
  /**
   * element to render
   * - paragraph
   *
   * leafs to render
   * - bold
   * - italic
   * - code
   * - underline
   * - strikethrough
   */

  const renderElement = React.useCallback(({element, children}) => {
    switch (element.type) {
      case ELEMENT_PARAGRAPH:
        return (
          <p className="px-2 py-1 text-body text-xl leading-loose">
            {children}
          </p>
        )
      default:
        return (
          <div>
            <div contentEditable={false} style={{userSelect: 'none'}}>
              <p>
                Element not supported by <code>ReadOnlyEditor</code>
              </p>
              <pre>
                <code>{JSON.stringify(element, null, 4)}</code>
              </pre>
            </div>
            {children}
          </div>
        )
    }
  }, [])

  const renderLeaf = React.useCallback(({children, leaf}) => {
    let Component: any = 'span'
    let className = ''

    if (leaf.bold) {
      Component = 'strong'
      className = 'font-bold'
    }

    if (leaf.italic) {
      Component = 'em'
      className = 'italic'
    }

    if (leaf.code) {
      Component = 'code'
      className = 'bg-muted text-body text-sm py-1 px-2 rounded-sm border-none'
    }

    if (leaf.underline) {
      className = 'underline'
    }

    if (leaf.strikethrough) {
      Component = 's'
      className = 'line-through'
    }

    return <Component className={className} children={children} />
  }, [])

  return (
    <SlateReactPresentation
      value={value}
      renderElement={renderElement}
      renderLeaf={renderLeaf}
    />
  )
}
