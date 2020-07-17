import React, {useEffect, useRef} from 'react'
import {Portal} from '../../components/portal'
import {useSlate, ReactEditor} from 'slate-react'
import {css} from 'emotion'

/**
 * Prevent default and call a handler if defined
 */
export const getPreventDefaultHandler = <T extends (...args: any) => any>(
  cb?: T,
  ...args: Parameters<T>
) => (event: any) => {
  event.preventDefault()
  cb?.(...(args as any))
}

export function HelperToolbar({
  at,
  valueIndex,
  onClickSelection,
  options,
  ...props
}) {
  const ref: any = useRef(null)
  const editor = useSlate()

  useEffect(() => {
    if (at && options.length > 0) {
      console.log('enter the useEffect')
      const el = ref.current
      const domRange = ReactEditor.toDOMRange(editor, at)
      const rect = domRange.getBoundingClientRect()
      console.log('rect', rect)
      if (el) {
        el.style.top = `${rect.top + window.pageYOffset + 24}px`
        el.style.left = `${rect.left + window.pageXOffset}px`
      }
    }
  }, [options.length, editor, at])

  if (!at) {
    return null
  }

  return (
    <Portal>
      <ul
        ref={ref}
        className={`overflow-hidden rounded shadow-md absolute z-20 ${css`
          width: 200px;
        `}`}
        {...props}
      >
        {options.map((option, i) => (
          <li
            key={`${i}${option.type}`}
            className={`px-4 py-2 ${
              i === valueIndex ? 'bg-blue-200' : 'bg-background'
            }`}
            onMouseDown={getPreventDefaultHandler(
              onClickSelection,
              editor,
              option,
            )}
          >
            <p>{option.name}</p>
          </li>
        ))}
      </ul>
    </Portal>
  )
}
