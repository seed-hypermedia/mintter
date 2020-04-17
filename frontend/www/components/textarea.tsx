import React, {forwardRef} from 'react'
import {css} from 'emotion'

interface TextareaProps {
  value?: string
  name?: string
  onChange?: (textValue: string) => void
  minHeight: number
  className?: string
  placeholder?: string
}

// eslint-disable-next-line react/display-name
const Textarea = (
  {value, name, onChange, minHeight, className, ...props}: TextareaProps,
  ref: any,
) => {
  const [innerValue, setInnerValue] = React.useState('')
  const innerRef = React.useRef(null)
  const divRef = React.useRef(null)
  const lh = React.useMemo(
    () => innerRef.current && getComputedStyle(innerRef.current)['line-height'],
    [],
  )

  React.useEffect(() => {
    update()
  })

  function handleChange(e) {
    if (onChange) {
      onChange(e.target.value)
      return
    } else {
      setInnerValue(e.target.value)
    }
  }

  function update() {
    const txt = innerRef.current
    if (txt) {
      const div = divRef.current
      const content = txt.value
      div.innerHTML = content
      div.style.visibility = 'hidden'
      div.style.display = 'block'
      txt.style.height = `${div.offsetHeight ? div.offsetHeight : lh}px`
      div.style.visibility = 'visible'
      div.style.display = 'none'
    }
  }

  function handleKeyDown(e) {
    if (e.keyCode === 13) {
      e.preventDefault()
      return false
    }
  }

  const content = value || innerValue

  return (
    <>
      <textarea
        {...props}
        className={`resize-none overflow-hidden text-base leading-normal w-full outline-none bg-transparent ${css`
          word-wrap: break-word;
          white-space: pre-wrap;
        `} ${className}`}
        value={content}
        name={name}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        ref={r => {
          innerRef.current = r
          ref && ref(r)
        }}
      />
      <div
        ref={divRef}
        className={`${className} ${css`
          word-wrap: break-word;
          white-space: pre-wrap;
          background: red;
          min-height: ${minHeight ? minHeight : lh}px;
          line-height: ${minHeight}px;
        `}`}
      ></div>
    </>
  )
}

export default forwardRef(Textarea)
