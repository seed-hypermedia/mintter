import * as Label from '@radix-ui/react-label'
import autosize from 'autosize'
import {forwardRef, useLayoutEffect, useRef} from 'react'
import mergeRefs from 'react-merge-refs'
import {v4} from 'uuid'

import {Box, BoxProps} from '../box'
import {styled} from '../stitches.config'
import {Text} from '../text'

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
        paddingHorizontal: '$4',
        paddingVertical: '$3',
      },
      2: {
        fontSize: '$3',
        lineHeight: '$2',
        paddingHorizontal: '$4',
        paddingVertical: '$3',
      },
      3: {
        fontSize: '$4',
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
})

export const TextField = forwardRef<
  HTMLInputElement,
  React.ComponentProps<typeof Input> & {
    label?: string
    hint?: string
    containerCss?: BoxProps['css']
  }
>(
  (
    {label, status = 'neutral', hint, id = v4(), containerCss, ...props},
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
      <Box
        // TODO: Fix types
        // @ts-ignore
        css={{
          display: 'flex',
          flexDirection: 'column',
          gap: '$2',
          width: '100%',
          ...containerCss,
        }}
      >
        {label ? (
          <Label.Root as={Text} htmlFor={id} css={{marginBottom: '$3'}}>
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
            size="2"
            css={{marginHorizontal: '$2'}}
          >
            {hint}
          </TextFieldHint>
        ) : null}
      </Box>
    )
  },
)

export type TextFieldProps = React.ComponentProps<typeof TextField>
