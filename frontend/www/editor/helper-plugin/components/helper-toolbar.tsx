import React, {useEffect, useRef} from 'react'
import {Portal} from 'components/portal'
import {useSlate, ReactEditor} from 'slate-react'
import {css} from 'emotion'

export function HelperToolbar({
  at,
  options,
  theme = 'theme-light',
  children,
  ...props
}) {
  const ref: any = useRef(null)
  const editor = useSlate()

  useEffect(() => {
    if (at && options.length > 0) {
      const el = ref.current
      let rect
      if (typeof at.getBoundingClientRect === 'function') {
        rect = at.getBoundingClientRect()
      } else {
        const domRange = ReactEditor.toDOMRange(editor, at)
        rect = domRange.getBoundingClientRect()
      }

      if (el) {
        el.style.top = `${rect.top + window.pageYOffset + 24}px`
        el.style.left = `${rect.left + window.pageXOffset}px`
      }
    }
  }, [options.length, editor, at])

  if (!at || !options.length) {
    return null
  }

  return (
    <Portal>
      <div
        ref={ref}
        className={`${theme} overflow-hidden rounded shadow-lg absolute z-20 ${css`
          width: 400px;
        `}`}
        {...props}
      >
        {children}
      </div>
    </Portal>
  )
}
