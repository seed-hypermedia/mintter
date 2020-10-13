import React from 'react'
import {getRenderElement, setDefaults} from '@udecode/slate-plugins'
import {DEFAULTS_READ_ONLY} from './defaults'
import {SlateReactPresentation} from 'slate-react-presentation'

export const renderElementReadOnly = (options?: any) => {
  const {read_only} = setDefaults(options, DEFAULTS_READ_ONLY)

  return getRenderElement({
    ...read_only,
    component: RenderElement,
  })
}

function RenderElement({attributes, children, element}) {
  const renderElement = React.useCallback(({children, element}) => {
    switch (element.type) {
      case 'p':
        return <p className="bg-red-500">{children}</p>
      default:
        return <p>{children}</p>
    }
  }, [])

  const renderLeaf = React.useCallback(({children, leaf}) => {
    if (leaf.bold) {
      children = <b className="BOLD LEAF font-bold">{children}</b>
    }

    return <span>{children}</span>
  }, [])

  return (
    <div {...attributes}>
      <div contentEditable={false} style={{userSelect: 'none'}}>
        <SlateReactPresentation
          value={element.children}
          renderElement={renderElement}
          renderLeaf={renderLeaf}
        />
      </div>
      {children}
    </div>
  )
}
