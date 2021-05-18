import { Text } from '@mintter/ui/text';
import * as ContextMenu from '@radix-ui/react-context-menu';
import { ELEMENT_BLOCK } from './create-block-plugin';
// TODO: fix types
export function BlockElement({
  attributes,
  children,
  className,
  element,
  ...rest
}: any) {
  if (element.type === ELEMENT_BLOCK) {
    return (
      <ContextMenu.Root>
        <ContextMenu.Trigger>
      <Text
        alt
        size="4"
        {...attributes}
        className={className}
        data-block-id={element.id}
        css={{":hover": {
          background: '$background-neutral-soft'
        }}}
      >
        {children}
      </Text>
      </ContextMenu.Trigger>
      <ContextMenu.Content>
        <ContextMenu.Item>item one</ContextMenu.Item>
        <ContextMenu.Item>item two</ContextMenu.Item>
        <ContextMenu.Item>item three</ContextMenu.Item>
      </ContextMenu.Content>
      </ContextMenu.Root>
    );
  }
}
