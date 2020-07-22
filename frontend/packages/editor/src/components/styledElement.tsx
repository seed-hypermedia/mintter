import React from 'react'
import {PARAGRAPH} from '../elements/paragraph'

export function renderElement({type = PARAGRAPH}) {
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
