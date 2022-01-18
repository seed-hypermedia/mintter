import {CSS, styled} from '@app/stitches.config'
import {FormEvent, useCallback, useEffect, useLayoutEffect, useRef} from 'react'

const StyledTextarea = styled(
  'textarea',
  {
    // resize: 'none',
    all: 'unset',
    display: 'block',
    fontFamily: '$default',
    outline: 'none',
    boxSizing: 'border-box',
    border: 'none',
    width: '$full',
    margin: 0,
    padding: 0,
    position: 'relative',
    lineHeight: '$2',
  },
  {
    defaultVariants: {
      fontWeight: 'regular',
    },
  },
)

type TextareaProps = {
  'data-testid'?: string
  name: string
  placeholder?: string
  value?: string
  onChange?: (event: FormEvent<HTMLTextAreaElement>) => void
  css?: CSS
}

export function Textarea(props: TextareaProps) {
  const localRef = useRef<HTMLTextAreaElement>(null)

  const autosize = useCallback(
    function autosize(ref: HTMLTextAreaElement | null) {
      if (ref) {
        ref.style.height = 'auto'
        ref.style.height = `${ref.scrollHeight}px`
      }
    },
    [localRef],
  )

  useEffect(() => {
    setTimeout(() => {
      autosize(localRef.current)
    }, 10)
  }, [])

  useLayoutEffect(
    function titleLayoutEffect() {
      autosize(localRef.current)
    },
    [props.value],
  )

  return <StyledTextarea {...props} ref={localRef} rows={1} />
}
