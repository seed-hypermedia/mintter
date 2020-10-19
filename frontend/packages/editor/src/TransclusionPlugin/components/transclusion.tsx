import React from 'react'
import {DragDrop} from '../../BlockPlugin/components/DragDrop'

const Transclusion = (
  {attributes, children, element, className, ...rest},
  ref,
) => {
  function handlePush(e) {
    e.preventDefault()
    if (rest.push) {
      rest.push(`/p/${element.split('/')[0]}`)
    }
    rest.dispatch?.({type: 'add_object', payload: element.id})
  }

  return (
    <DragDrop attributes={attributes} element={element} componentRef={ref}>
      <div
        className={`pr-0 relative rounded my-1 outline-none ${
          className ? className : ''
        }`}
      >
        <div
          contentEditable={false}
          className="absolute top-0 right-0 transform translate-x-full pl-2"
        >
          <button
            onClick={handlePush}
            className="text-xs text-body-muted hover:text-body transition duration-100"
          >
            Open Document
          </button>
        </div>
        {children}
      </div>
    </DragDrop>
  )
}

export const TransclusionElement = React.forwardRef(Transclusion)
