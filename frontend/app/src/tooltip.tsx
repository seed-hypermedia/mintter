import * as React from 'react';
import * as TooltipPrimitive from '@radix-ui/react-tooltip';
import { Slot } from '@radix-ui/react-slot';
import { styled } from '@mintter/ui-legacy/stitches.config';

const StyledContent = styled(TooltipPrimitive.Content, {
  borderRadius: 3,
  padding: '5px 10px',
  fontSize: 14,
  bc: '$text',
  color: 'white',
});
const StyledArrow = styled(TooltipPrimitive.Arrow, {
  fill: '$text',
});

export type TooltipProps = {
  content: string | React.ReactNode;
  open?: boolean;
};

export const Tooltip: React.FC<TooltipProps> = ({
  children,
  content,
  open,
  ...props
}) => (
  <TooltipPrimitive.Root open={open} {...props}>
    <TooltipPrimitive.Trigger as={Slot}>{children}</TooltipPrimitive.Trigger>
    <StyledContent side="top" align="center" {...props}>
      {content}
      <StyledArrow offset={5} width={11} height={5} />
    </StyledContent>
  </TooltipPrimitive.Root>
);
