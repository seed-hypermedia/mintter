import {styled} from '@app/stitches.config'
import * as TooltipPrimitive from '@radix-ui/react-tooltip'
import {PropsWithChildren} from 'react'

const StyledContent = styled(TooltipPrimitive.Content, {
  zIndex: '$max',
  borderRadius: '$1',
  paddingVertical: '$2',
  paddingHorizontal: '$3',
  fontSize: '$1',
  backgroundColor: '$base-text-high',
  color: '$base-text-opposite',
  fontFamily: '$base',
})
const StyledArrow = styled(TooltipPrimitive.Arrow, {
  fill: '$base-text-high',
})

export type TooltipProps = PropsWithChildren<{
  content: string | React.ReactNode
  open?: boolean
}>

export function Tooltip({children, content, open, ...props}: TooltipProps) {
  return (
    <TooltipPrimitive.Root open={open} {...props}>
      <TooltipPrimitive.Trigger asChild>{children}</TooltipPrimitive.Trigger>
      <StyledContent side="top" align="center" {...props}>
        {content}
        <StyledArrow offset={5} width={11} height={5} />
      </StyledContent>
    </TooltipPrimitive.Root>
  )
}
