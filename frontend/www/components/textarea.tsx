import React from 'react'
import {css} from 'emotion'
import {mergeRefs} from '@mintter/editor'

function TextareaComponent(
  {
    value,
    onChange,
    className,
    onEnterPress,
    rows = 1,
    readOnly = false,

    ...props
  },
  ref,
) {
  const innerRef = React.useRef(null)
  const mergedRef = mergeRefs(ref, innerRef)
  React.useLayoutEffect(autosize, [value])

  function autosize() {
    const tEl = innerRef.current
    if (tEl) {
      tEl.style.height = 'auto'
      tEl.style.height = `${tEl.scrollHeight}px`
    }
  }

  const handleChange = React.useCallback(e => {
    if (onChange) {
      onChange(e.target.value)
    }
  }, [])

  const handleKeyDown = React.useCallback(e => {
    if (e.keyCode === 13 && onEnterPress) {
      e.preventDefault()
      onEnterPress(e)
      return false
    }
  }, [])
  return (
    <textarea
      {...props}
      ref={mergedRef}
      value={value}
      onKeyDown={handleKeyDown}
      onChange={handleChange}
      className={`resize-none overflow-hidden leading-normal w-full outline-none bg-transparent ${className}`}
      rows="1"
      style={{
        width: '100%',
        position: 'relative',
        display: 'block',
      }}
    />
  )
}

export default React.forwardRef(TextareaComponent)
