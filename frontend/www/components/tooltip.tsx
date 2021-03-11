import * as React from 'react'
import * as TooltipPrimitive from '@radix-ui/react-tooltip'
import {Slot} from '@radix-ui/react-slot'
import {styled} from 'shared/stitches.config'

const StyledContent = styled(TooltipPrimitive.Content, {
  borderRadius: 3,
  padding: '5px 10px',
  fontSize: 14,
  bc: '$text',
  color: 'white',
})
const StyledArrow = styled(TooltipPrimitive.Arrow, {
  fill: '$text',
})

export function Tooltip({
  children,
  content,
  isOpen,
  defaultIsOpen,
  onIsOpenChange,
  ...props
}) {
  return (
    <TooltipPrimitive.Root
      isOpen={isOpen}
      defaultIsOpen={defaultIsOpen}
      onIsOpenChange={onIsOpenChange}
    >
      <TooltipPrimitive.Trigger as={Slot}>{children}</TooltipPrimitive.Trigger>
      <StyledContent side="top" align="center" {...props}>
        {content}
        <StyledArrow offset={5} width={11} height={5} />
      </StyledContent>
    </TooltipPrimitive.Root>
  )
}
