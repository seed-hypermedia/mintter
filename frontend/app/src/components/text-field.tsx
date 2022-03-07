import type { CSS } from '@app/stitches.config'
import { styled } from '@app/stitches.config'
import * as Label from '@radix-ui/react-label'
import type * as Stitches from '@stitches/react'
import { css } from '@stitches/react'
import autosize from 'autosize'
import { nanoid } from 'nanoid/non-secure'
import type { InputHTMLAttributes, LegacyRef, MutableRefObject, PropsWithChildren, RefCallback } from 'react'
import { forwardRef, useLayoutEffect, useRef } from 'react'
import { Box } from './box'
import { Text } from './text'

const InputContainer = styled(Box, {
  display: 'flex',
  flexDirection: 'column',
  width: '100%',

  variants: {
    size: {
      1: {
        gap: '$2',
      },
      2: {
        gap: '$3',
      },
    },
  },

  defaultVariants: {
    size: '2',
  },
})

const inputStyles = css({
  $$backgroundColor: '$colors$background-default',

  all: 'unset',
  backgroundColor: '$$backgroundColor',
  border: 'none',
  boxShadow: '0 0 0 1px $$borderColor',
  boxSizing: 'border-box',
  color: '$$textColor',
  display: 'block',
  fontFamily: '$default',
  outline: 'none',
  width: '100%',

  '&:before': {
    boxSizing: 'border-box',
  },

  '&:after': {
    boxSizing: 'border-box',
  },

  '&:hover': {
    boxShadow: '0 0 0 1px $$hoveredBorderColor',
  },

  '&:active': {
    boxShadow: '0 0 0 1px $$hoveredBorderColor',
  },

  '&:focus': {
    outline: 'none',
    boxShadow: '0 0 0 2px $$hoveredBorderColor',
  },

  '&:disabled': {
    boxShadow: '0 0 0 1px $$borderColor',
    cursor: 'no-drop',
    opacity: 0.5,
    pointerEvents: 'none',
  },

  variants: {
    size: {
      1: {
        fontSize: '$2',
        lineHeight: '$1',
        paddingHorizontal: '$3',
        paddingVertical: '$2',
      },
      2: {
        fontSize: '$3',
        lineHeight: '$2',
        paddingHorizontal: '$4',
        paddingVertical: '$3',
      },
    },
    shape: {
      rounded: {
        borderRadius: '$2',
      },
      pill: {
        borderRadius: '$pill',
      },
    },
    status: {
      neutral: {
        $$borderColor: '$colors$background-neutral',
        $$hoveredBorderColor: '$colors$background-neutral-strong',
        $$textColor: '$colors$text-default',
      },
      success: {
        $$borderColor: '$colors$success-softer',
        $$hoveredBorderColor: '$colors$success-default',
        $$textColor: '$colors$success-default',
      },
      warning: {
        $$borderColor: '$colors$warning-softer',
        $$hoveredBorderColor: '$colors$warning-default',
        $$textColor: '$colors$warning-default',
      },
      danger: {
        $$borderColor: '$colors$danger-softer',
        $$hoveredBorderColor: '$colors$danger-default',
        $$textColor: '$colors$danger-default',
      },
    },
  },

  defaultVariants: {
    size: '2',
    shape: 'rounded',
    status: 'neutral',
  },
})

const Input = styled('input', inputStyles)
const Textarea = styled('textarea', inputStyles)

export type InputVariants = Stitches.VariantProps<typeof inputStyles>

export type InputProps = InputVariants

// @ts-ignore
const InputElement = forwardRef<HTMLInputElement, PropsWithChildren<InputProps>>(function InputElement(props, ref) {
  return <Input ref={ref} {...props} />
})

// @ts-ignore
const TextareaElement = forwardRef<HTMLTextAreaElement, PropsWithChildren<InputProps>>(function TextareaElement(
  props,
  ref,
) {
  return <Textarea ref={ref} {...props} />
})

const TextFieldHint = styled(Text, {
  variants: {
    status: {
      neutral: {
        color: '$text-muted',
      },
      success: {
        color: '$success-default',
      },
      warning: {
        color: '$warning-default',
      },
      danger: {
        color: '$danger-default',
      },
    },
  },

  defaultVariants: {
    status: 'neutral',
  },
})

type TextFieldProps = PropsWithChildren<
  InputHTMLAttributes<HTMLInputElement | HTMLTextAreaElement> &
  InputProps & {
    id?: string
    label?: string
    hint?: string
    containerCss?: CSS
    textarea?: boolean
    rows?: number
  }
>

export const TextField = forwardRef<HTMLInputElement, TextFieldProps>(
  ({ label, status = 'neutral', hint, id = nanoid(), containerCss, textarea = false, ...props }: TextFieldProps, ref) => {
    const localRef = useRef<HTMLInputElement>(null)

    useLayoutEffect(() => {
      if (textarea) {
        autosize(localRef.current!)
      }
    }, [textarea])

    let InputComponent = textarea ? TextareaElement : InputElement

    return (
      <InputContainer size={props.size} css={containerCss}>
        {label ? (
          <Label.Root asChild htmlFor={id}>
            <Text size={props.size == 1 ? '2' : props.size == 2 ? '3' : undefined}>{label}</Text>
          </Label.Root>
        ) : null}
        <InputComponent ref={mergeRefs<HTMLInputElement | HTMLTextAreaElement>([localRef, ref])} {...props} />
        {hint ? (
          <TextFieldHint status={status} size={props.size == 1 || props.size == 2 ? props.size : undefined}>
            {hint}
          </TextFieldHint>
        ) : null}
      </InputContainer>
    )
  },
)
TextField.displayName = 'TextField'

function mergeRefs<T = any>(refs: Array<MutableRefObject<T> | LegacyRef<T>>): RefCallback<T> {
  return (value: T | null) => {
    refs.forEach((ref) => {
      if (typeof ref == 'function') {
        ref(value)
      } else if (ref != null) {
        ; (ref as MutableRefObject<T | null>).current = value
      }
    })
  }
}
