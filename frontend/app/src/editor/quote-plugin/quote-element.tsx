import { useFocused, useSelected } from "slate-react";
import {Text} from '@mintter/ui/text'

export function QuoteElement({attributes, element, children}) {
  const focused = useFocused()
  const selected = useSelected()

  console.log({focused, selected})
  return <Text css={{background: '$warning-softer', display: 'inline-block', paddingHorizontal: '$2', paddingVertical: '$1'}} as="span" {...attributes} data-quote-id={element.id} >
      <span contentEditable={false}>quote here</span>
      {children}
  </Text>;
}
