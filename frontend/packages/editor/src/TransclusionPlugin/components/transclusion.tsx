import React from 'react'
import {
  // ReactEditor, useEditor,
  useFocused,
  useSelected,
} from 'slate-react'
import {DragDrop} from '../../BlockPlugin/components/DragDrop'

const Transclusion = (
  {attributes, children, element, className, push},
  ref,
) => {
  const selected = useSelected()
  const focus = useFocused()

  function handlePush(e) {
    e.preventDefault()
    console.log('go to parent document', element.id)
    push && push(`/p/${element.id.split('/')[0]}`)
  }

  return (
    <DragDrop attributes={attributes} element={element} componentRef={ref}>
      <div
        className={`pl-4 pr-0 relative rounded my-1 outline-none ${
          focus && selected ? 'shadow-outline' : ''
        }${className ? className : ''}`}
      >
        <div
          contentEditable={false}
          className="absolute top-0 right-0 transform translate-x-full pl-2"
        >
          <button
            onClick={handlePush}
            className="text-xs text-body-muted hover:text-body transition duration-100"
          >
            Go to Document
          </button>
        </div>
        {children}
      </div>
    </DragDrop>
  )
}

export const TransclusionElement = React.forwardRef(Transclusion)
