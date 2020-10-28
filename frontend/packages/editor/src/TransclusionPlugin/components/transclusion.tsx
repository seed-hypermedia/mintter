import {Icons} from '../../components/icons'
import React from 'react'
import {DragDrop} from '../../BlockPlugin/components/DragDrop'
import Tippy from '@tippyjs/react'
import {css} from 'emotion'

const Transclusion = (
  {attributes, children, element, className, ...rest},
  ref,
) => {
  function handlePush(e) {
    console.log(element.id)
    e.preventDefault()
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
          className={`absolute right-0 transform translate-x-full pl-1 ${css`
            top: -2px;
          `}`}
        >
          <Tippy
            content={
              <span
                className={`px-2 py-1 text-xs font-light transition duration-200 rounded bg-muted-hover ${css`
                  background-color: #333;
                  color: #ccc;
                `}`}
              >
                Open in Interaction Panel
              </span>
            }
          >
            <button
              onClick={handlePush}
              className="text-xs text-body-muted p-1 rounded-sm hover:bg-muted transition duration-100"
            >
              <Icons.CornerUpRight size={12} />
            </button>
          </Tippy>
        </div>
        {children}
      </div>
    </DragDrop>
  )
}

export const TransclusionElement = React.forwardRef(Transclusion)
