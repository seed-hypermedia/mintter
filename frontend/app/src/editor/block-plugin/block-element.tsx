import { Text } from '@mintter/ui/text';
import { ELEMENT_BLOCK } from './create-block-plugin';
// TODO: fix types
export function BlockElement(props: any) {
  if (props.element.type === ELEMENT_BLOCK) {
    return <Text alt size="4" {...props} />;
  }
}
