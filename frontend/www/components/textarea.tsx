import * as React from 'react'
import {StitchesVariants} from '@stitches/core'
import {FormControl} from './form-control'
import {mergeRefs} from 'editor/merge-refs'

const TEXTAREA_TAG = 'textarea'

type TextAreaCSSProp = Pick<CSS<typeof FormControl>, 'css'>
type TextAreaVariants = StitchesVariants<typeof FormControl>
type TextAreaOwnProps = TextAreaCSSProp & TextAreaVariants

export type TextAreaComponent = Polymorphic.ForwardRefComponent<
  typeof TEXTAREA_TAG,
  TextAreaOwnProps
>

export const Textarea = React.forwardRef(
  (
    {value, onChange, className, onEnterPress, rows = 1, variant, ...props},
    ref,
  ) => {
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
      <FormControl
        as="textarea"
        {...props}
        ref={mergedRef}
        value={value}
        onKeyDown={handleKeyDown}
        onChange={handleChange}
        className={`resize-none overflow-hidden leading-normal w-full outline-none bg-transparent ${className}`}
        rows={rows}
        css={{
          resize: 'none',
          overflow: 'hidden',
          lineHeight: '$1',
          width: '100%',
          display: 'block',
          position: 'relative',
        }}
        variant={variant}
      />
    )
  },
) as TextAreaComponent
