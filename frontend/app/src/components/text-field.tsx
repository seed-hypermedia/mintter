import type {CSS} from '@app/stitches.config'
import {styled} from '@app/stitches.config'
import {mergeRefs} from '@app/utils/mege-refs'
import * as Label from '@radix-ui/react-label'
import type * as Stitches from '@stitches/react'
import {css} from '@stitches/react'
import autosize from 'autosize'
import {nanoid} from 'nanoid/non-secure'
import type {InputHTMLAttributes, PropsWithChildren} from 'react'
import {forwardRef, useLayoutEffect, useRef} from 'react'
import {Box} from './box'
import {Text} from './text'

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
  all: 'unset',
  backgroundColor: '$$backgroundColor',
  border: 'none',
  boxShadow: '0 0 0 1px $$borderColor',
  boxSizing: 'border-box',
  color: '$$textColor',
  display: 'block',
  fontFamily: '$base',
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
    boxShadow: '0 0 0 1px $$activeBorderColor',
  },

  '&:focus': {
    outline: 'none',
    boxShadow: '0 0 0 1px $$activeBorderColor',
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
      base: {
        $$backgroundColor: '$colors$base-component-bg-normal',
        $$borderColor: '$colors$base-border-normal',
        $$hoveredBorderColor: '$colors$base-border-hover',
        $$activeBorderColor: '$colors$base-active',
        $$textColor: '$colors$base-text-low',
      },
      success: {
        $$backgroundColor: '$colors$success-component-bg-normal',
        $$borderColor: '$colors$success-border-normal',
        $$hoveredBorderColor: '$colors$success-border-hover',
        $$activeBorderColor: '$colors$success-active',
        $$textColor: '$colors$success-text-low',
      },
      warning: {
        $$backgroundColor: '$colors$warning-component-bg-normal',
        $$borderColor: '$colors$warning-border-normal',
        $$hoveredBorderColor: '$colors$warning-border-hover',
        $$activeBorderColor: '$colors$warning-active',
        $$textColor: '$colors$warning-text-low',
      },
      danger: {
        $$backgroundColor: '$colors$danger-component-bg-normal',
        $$borderColor: '$colors$danger-border-normal',
        $$hoveredBorderColor: '$colors$danger-border-hover',
        $$activeBorderColor: '$colors$danger-active',
        $$textColor: '$colors$danger-text-low',
      },
      muted: {
        $$backgroundColor: 'transparent',
        $$borderColor: 'transparent',
        $$hoveredBorderColor: 'transparent',
        $$activeBorderColor: 'transparent',
        $$textColor: '$colors$base-text-low',
      },
    },
  },

  defaultVariants: {
    size: '2',
    shape: 'rounded',
    status: 'base',
  },
})

export const Input = styled('input', inputStyles)
export const Textarea = styled('textarea', inputStyles)

export type InputVariants = Stitches.VariantProps<typeof inputStyles>

export type InputProps = InputVariants

// @ts-ignore
const InputElement = forwardRef<
  HTMLInputElement,
  PropsWithChildren<InputProps>
>(function InputElement(props, ref) {
  return <Input ref={ref} {...props} />
})

// @ts-ignore
const TextareaElement = forwardRef<
  HTMLTextAreaElement,
  PropsWithChildren<InputProps>
>(function TextareaElement(props, ref) {
  return <Textarea ref={ref} {...props} />
})

const TextFieldHint = styled(Text, {
  variants: {
    status: {
      neutral: {
        color: '$base-text-low',
      },
      success: {
        color: '$success-text-low',
      },
      warning: {
        color: '$warning-text-low',
      },
      danger: {
        color: '$danger-text-low',
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
      css?: CSS
    }
>

export const TextField = forwardRef<HTMLInputElement, TextFieldProps>(
  (
    {
      label,
      status = 'base',
      hint,
      id = nanoid(),
      containerCss,
      textarea = false,
      ...props
    }: TextFieldProps,
    ref,
  ) => {
    const localRef = useRef<HTMLInputElement>(null)

    useLayoutEffect(() => {
      if (textarea && localRef.current) {
        autosize(localRef.current)
      }
    }, [textarea])

    let InputComponent = textarea ? TextareaElement : InputElement

    return (
      <InputContainer size={props.size} css={containerCss}>
        {label ? (
          <Label.Root asChild htmlFor={id}>
            <Text
              size={props.size == 1 ? '2' : props.size == 2 ? '3' : undefined}
              color={status}
            >
              {label}
            </Text>
          </Label.Root>
        ) : null}
        <InputComponent
          ref={mergeRefs<HTMLInputElement | HTMLTextAreaElement>([
            localRef,
            ref,
          ])}
          status={status}
          {...props}
        />
        {hint ? (
          <TextFieldHint
            status={status}
            size={props.size == 1 || props.size == 2 ? props.size : undefined}
          >
            {hint}
          </TextFieldHint>
        ) : null}
      </InputContainer>
    )
  },
)
TextField.displayName = 'TextField'
