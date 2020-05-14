import React, {forwardRef} from 'react'
import {css} from 'emotion'

interface TextareaProps {
  id?: string
  value?: string
  name?: string
  onChange?: (textValue: string) => void
  minHeight?: number
  className?: string
  placeholder?: string
  onEnterPress?: (e: any) => void
}

// eslint-disable-next-line react/display-name
const Textarea = (
  {
    value: valueFromProps,
    name,
    onChange,
    minHeight,
    className,
    onEnterPress,
    ...props
  }: TextareaProps,
  ref: any,
) => {
  const [value, setInnerValue] = React.useState(() =>
    valueFromProps
      ? valueFromProps
      : typeof ref === 'function'
      ? undefined
      : '',
  )
  const innerRef = React.useRef(null)
  const divRef = React.useRef(null)
  const lh = React.useMemo(
    () => innerRef.current && getComputedStyle(innerRef.current)['line-height'],
    [],
  )
  React.useEffect(() => {
    update()
  })

  React.useEffect(() => {
    setInnerValue(valueFromProps)
  }, [valueFromProps])

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
      // const content = txt.value
      div.style.visibility = 'hidden'
      div.style.display = 'block'
      txt.style.height = `${div.offsetHeight ? div.offsetHeight : lh}px`
      div.style.visibility = 'visible'
      div.style.display = 'none'
    }
  }

  function handleKeyDown(e) {
    if (e.keyCode === 13 && onEnterPress) {
      e.preventDefault()
      onEnterPress(e)
      return false
    }
  }

  const divValue = innerRef?.current?.value || ''

  return (
    <>
      <textarea
        {...props}
        className={`resize-none overflow-hidden text-base leading-normal w-full outline-none bg-transparent ${css`
          word-wrap: break-word;
          white-space: pre-wrap;
        `} ${className}`}
        value={value}
        name={name}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        ref={r => {
          innerRef.current = r
          if (ref) {
            if (typeof ref === 'function') {
              ref(r)
            } else {
              ref.current = r
            }
          }
        }}
      />
      <div
        ref={divRef}
        className={`leading-normal ${className} ${css`
          word-wrap: break-word;
          white-space: pre-wrap;
          min-height: ${minHeight ? minHeight : lh}px;
          // line-height: ${minHeight}px;
        `}`}
      >
        {divValue}
        {/* this empty space is to let the textarea aware of it to change its size, thanks to trevorblades! */}
        {divValue[divValue.length - 1] === '\n' && '\n'}
      </div>
    </>
  )
}

export default forwardRef(Textarea)
