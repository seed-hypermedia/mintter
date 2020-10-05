import React from 'react'
import {ELEMENT_PARAGRAPH} from '../elements/defaults'

export function renderElement({type = ELEMENT_PARAGRAPH}) {
  return function StyledElement({
    attributes,
    element,
    as: Component,
    className,
    children,
  }) {
    return element.type === type ? (
      <Component {...attributes} className={className}>
        {children}
      </Component>
    ) : null
  }
}
