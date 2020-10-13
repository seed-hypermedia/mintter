import React from 'react'
import {useFocused, useSelected} from 'slate-react'
import {getRenderElement, setDefaults} from '@udecode/slate-plugins'
import {DEFAULTS_READ_ONLY} from './defaults'
import {SlateReactPresentation} from 'slate-react-presentation'
import {ELEMENT_PARAGRAPH} from '../elements/defaults'

export const renderElementReadOnly = (options?: any) => {
  const {read_only} = setDefaults(options, DEFAULTS_READ_ONLY)

  return getRenderElement({
    ...read_only,
    component: RenderElement,
  })
}

function RenderElement(props) {
  const selected = useSelected()
  const focus = useFocused()
  console.log({props})
  const renderElement = React.useCallback(({attributes, children, element}) => {
    switch (element.type) {
      case ELEMENT_PARAGRAPH:
        return (
          <p
            {...attributes}
            className="px-2 py-1 text-body text-xl leading-loose"
          >
            {children}
          </p>
        )
      default:
        return (
          <p {...attributes} className="bg-teal-300 px-2 py-1 text-xl relative">
            <span
              contentEditable={false}
              className="absolute top-0 left-0 text-xs text-teal-600 uppercase"
            >
              Element not supported
            </span>
            {children}
          </p>
        )
    }
  }, [])

  const renderLeaf = React.useCallback(({attributes, children, leaf}) => {
    if (leaf.bold) {
      children = <strong className="font-bold">{children}</strong>
    }

    return <span {...attributes}>{children}</span>
  }, [])

  return (
    <div {...props.attributes}>
      <div
        contentEditable={false}
        className={`bg-muted ${focus && selected ? 'shadow-outline' : ''}`}
      >
        <SlateReactPresentation
          value={props.element.children}
          renderElement={renderElement}
          renderLeaf={renderLeaf}
        />
      </div>
      {props.children}
    </div>
  )
}
