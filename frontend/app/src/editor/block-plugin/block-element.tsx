import { Text } from '@mintter/ui/text';
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
      <Text
        alt
        size="4"
        {...attributes}
        className={className}
        data-block-id={element.id}
      >
        {children}
      </Text>
    );
  }
}
