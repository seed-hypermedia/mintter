import React from 'react'
import {css} from 'emotion'

export default function Textarea({
  value = '',
  onChange,
  className = '',
  ...props
}) {
  const [text, setText] = React.useState<string>(value)
  const ref = React.useRef<HTMLTextAreaElement>()
  const divRef = React.useRef<HTMLDivElement>()

  function handleChange(e) {
    setText(e.target.value)
    onChange && onChange(e.target.value)
  }

  function handleInput(e) {}

  React.useEffect(() => {
    const textarea = ref.current
    textarea.addEventListener('input', handleInput)

    return () => {
      textarea.removeEventListener('input', handleInput)
    }
  }, [])

  React.useEffect(() => {
    const txt = ref.current
    if (ref.current) {
      const div = divRef.current
      const content = txt.value
      div.innerHTML = content
      div.style.visibility = 'hidden'
      div.style.display = 'block'
      txt.style.height = `${div.offsetHeight}px`
      div.style.visibility = 'visible'
      div.style.display = 'none'
    }
  }, [text])

  return (
    <>
      <textarea
        ref={ref}
        {...props}
        value={text}
        onChange={handleChange}
        className={`resize-none overflow-hidden text-base leading-normal w-full outline-none bg-transparent ${css`
          word-wrap: break-word;
        `} ${className}`}
      />
      <div
        ref={divRef}
        className={`hidden whitespace-pre-wrap break-words text-base leading-normal ${css`
          word-wrap: break-word;
        `} ${className}`}
      />
    </>
  )
}
