import {styled} from '@mintter/ui/stitches.config'
import {Box, Text, Icon} from '@mintter/ui'
import * as ContextMenu from '@radix-ui/react-context-menu'
import {ELEMENT_BLOCK} from './create-block-plugin'
import type {SPRenderElementProps} from '@udecode/slate-plugins-core'
import type {EditorBlock} from '../types'
// TODO: fix types
export function BlockElement({
  attributes,
  children,
  className,
  element,
  ...rest
}: SPRenderElementProps<EditorBlock>) {
  function onOpenChange(open: boolean) {
    console.log('open changed! = ', open)
  }

  function onCopyBlockId() {
    console.log('onCopyBlockId!')
  }
  function onOpenInSidepanel() {
    console.log('onOpenInSidepanel!')
  }
  if (element.type == ELEMENT_BLOCK) {
    return (
      <ContextMenu.Root onOpenChange={onOpenChange}>
        <ContextMenu.Trigger>
          <Text
            alt
            size="4"
            {...attributes}
            className={className}
            data-block-id={element.id}
            css={{
              paddingVertical: '$2',
              paddingHorizontal: '$4',
              '&:hover': {
                backgroundColor: '$background-default',
                borderRadius: '3px',
              },
            }}
          >
            {children}
          </Text>
        </ContextMenu.Trigger>
        <Box
          as={ContextMenu.Content}
          css={{
            background: 'white',
            padding: '$1', // we need the padding so the menu can stay open on click
            boxShadow: '0px 5px 15px -5px hsla(206,22%,7%,.15)',
          }}
        >
          <StyledContextMenuItem onSelect={onOpenInSidepanel}>
            <Icon size="1" name="ArrowTopRight" />
            <Text size="2">Open in Sidepanel</Text>
          </StyledContextMenuItem>
          <StyledContextMenuItem onSelect={onCopyBlockId}>
            <Icon size="1" name="Copy" />
            <Text size="2">Copy Block Ref</Text>
          </StyledContextMenuItem>
        </Box>
      </ContextMenu.Root>
    )
  }
}

const StyledContextMenuItem = styled(ContextMenu.Item, {
  display: 'flex',
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'start',
  gap: '$4',
  paddingVertical: '$2',
  paddingHorizontal: '$4',
  cursor: 'pointer',
  '&:hover': {},
  '&:focus': {
    outline: 'none',
    backgroundColor: '$primary-muted',
  },
  [`& ${Text}`]: {
    flex: 1,
  },
})
