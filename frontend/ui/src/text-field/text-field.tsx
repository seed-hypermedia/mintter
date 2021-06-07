import * as Label from '@radix-ui/react-label'
import autosize from 'autosize'
import { forwardRef, useLayoutEffect, useRef } from 'react'
import mergeRefs from 'react-merge-refs'
import { nanoid } from 'nanoid'

import { Box } from '../box'
import { styled } from '../stitches.config'
import { Text } from '../text'

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

const Input = styled('input', {
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

type TextFieldProps = React.ComponentProps<typeof Input> & {
  label?: string
  hint?: string
  containerCss?: React.ComponentProps<typeof InputContainer>['css']
}

export const TextField = forwardRef<HTMLInputElement, TextFieldProps>((
  { label, status = 'neutral', hint, id = nanoid(), containerCss, ...props }: TextFieldProps,
  ref,
) => {
  const localRef = useRef<HTMLInputElement>(null)

  useLayoutEffect(() => {
    if ((props as any).as === 'textarea') {
      autosize(localRef.current!)
    }
  }, [props])

  return (
    // TODO: Fix types
    // @ts-ignore
    <InputContainer size={props.size} css={containerCss}>
      {label ? (
        <Label.Root
          as={Text}
          htmlFor={id}
          size={
            props.size === '1' ? '2' : props.size === '2' ? '3' : undefined
          }
        >
          {label}
        </Label.Root>
      ) : null}
      {/* 
      TODO: Fix types
      // @ts-ignore */}
      <Input
        ref={mergeRefs([localRef, ref])}
        id={id}
        status={status}
        {...props}
      />
      {hint ? (
        <TextFieldHint
          status={status}
          size={
            props.size === '1' ? '1' : props.size === '2' ? '2' : undefined
          }
        >
          {hint}
        </TextFieldHint>
      ) : null}
    </InputContainer>
  )
},
)
TextField.displayName = 'TextField'