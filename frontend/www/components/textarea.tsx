import React from 'react'
import {css} from 'emotion'
import ExpandingTextarea from 'react-expanding-textarea'

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
    <ExpandingTextarea
      {...props}
      ref={ref}
      onKeyDown={handleKeyDown}
      value={value}
      className={`resize-none overflow-hidden leading-normal w-full outline-none bg-transparent ${className}`}
      rows={rows}
      onChange={handleChange}
    />
  )
}

export default React.forwardRef(TextareaComponent)
