import React, {forwardRef} from 'react'
import {css} from 'emotion'

interface TextareaProps extends React.HTMLAttributes<HTMLTextAreaElement> {
  value?: string
  name?: string
}

// eslint-disable-next-line react/display-name
const Textarea = forwardRef(
  (
    {value = '', onChange = null, className = '', ...props}: TextareaProps,
    ref,
  ) => {
    const [text, setText] = React.useState<string>(value)
    const innerRef = React.useRef<HTMLTextAreaElement>()
    const divRef = React.useRef<HTMLDivElement>()

    function handleChange(e) {
      setText(e.target.value)
      onChange && onChange(e.target.value)
    }

    // function handleInput(e) {}

    // React.useEffect(() => {
    //   const textarea = innerRef.current
    //   textarea.addEventListener('input', handleInput)

    //   return () => {
    //     textarea.removeEventListener('input', handleInput)
    //   }
    // }, [])

    React.useEffect(() => {
      const txt = innerRef.current
      if (innerRef.current) {
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
          ref={r => {
            innerRef.current = r
            ref(r)
          }}
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
  },
)

export default Textarea
