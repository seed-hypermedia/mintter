import {styled} from '@app/stitches.config'
import * as TooltipPrimitive from '@radix-ui/react-tooltip'
import {PropsWithChildren} from 'react'

const StyledContent = styled(TooltipPrimitive.Content, {
  borderRadius: '$2',
  paddingVertical: '$3',
  paddingHorizontal: '$4',
  fontSize: '$2',
  backgroundColor: '$background-opposite',
  color: '$text-opposite',
})
const StyledArrow = styled(TooltipPrimitive.Arrow, {
  fill: '$background-opposite',
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
