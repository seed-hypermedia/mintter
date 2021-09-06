import type {FlowContent, Statement} from '@mintter/mttast'
import {Icon} from '@mintter/ui/icon'
import {styled} from '@mintter/ui/stitches.config'
import {forwardRef} from 'react'
import {Marker} from './marker'
import {Dropdown} from './dropdown'
import {Slot} from '@radix-ui/react-slot'
import {Text} from '@mintter/ui/text'
import {useSlateStatic} from 'slate-react'
import {ReactEditor} from 'slate-react'
import {Transforms, Editor, Path} from 'slate'
import type {MTTEditor} from './utils'
import {blockquote, code, heading, statement} from '@mintter/mttast-builder'
import {useReadOnly} from 'slate-react'

export const Tools = styled('div', {
  height: '100%',
  overflow: 'hidden',
  alignSelf: 'start',
  display: 'flex',
  // alignItems: 'center',
  userSelect: 'none',
  WebkitUserSelect: 'none',
  transition: 'all ease-in-out 0.1s',
})

// export const Dragger = styled('div', {
//   // backgroundColor: 'red',
//   width: '$space$8',
//   display: 'flex',
//   alignItems: 'center',
//   justifyContent: 'center',
//   height: 32,
//   borderRadius: '$2',
//   opacity: 0,
//   transition: 'all ease-in-out 0.1s',
//   '&:hover': {
//     opacity: 1,
//     // cursor: 'grab',
//   },
// })

export const ElementDropdown = styled('div', {
  // backgroundColor: 'red',
  width: '$space$8',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  height: 32,
  borderRadius: '$2',
  opacity: 0,
  transition: 'all ease-in-out 0.1s',
  [`${Tools}:hover &`]: {
    opacity: 1,
    //   // cursor: 'grab',
  },
})

const items = [
  {
    label: 'Statement',
    iconName: 'Paragraph',
    onSelect: setType(statement),
  },
  {
    label: 'Heading',
    iconName: 'Heading',
    onSelect: setType(heading),
  },
  {
    label: 'Blockquote',
    iconName: 'MessageBubble',
    onSelect: setType(blockquote),
  },
  {
    label: 'Code block',
    iconName: 'AddCircle',
    onSelect: setType(code),
  },
]

export const StatementTools = forwardRef(({element}: {element: FlowContent}, ref) => {
  const editor = useSlateStatic()
  const isReadOnly = useReadOnly()
  const path = ReactEditor.findPath(editor, element)
  return (
    <Tools contentEditable={false} ref={ref}>
      {!isReadOnly ? (
        <Dropdown.Root>
          <Dropdown.Trigger as={Slot}>
            <ElementDropdown data-dragger>
              <Icon name="AddCircle" size="2" color="muted" />
            </ElementDropdown>
          </Dropdown.Trigger>
          <Dropdown.Content align="start" side="bottom" css={{minWidth: 220}}>
            <Dropdown.Label>
              <Text color="muted" size="2" css={{marginHorizontal: '$3', marginVertical: '$2'}}>
                Turn Statement into:
              </Text>
            </Dropdown.Label>
            {items.map((item) => (
              <Dropdown.Item key={item.label} onSelect={() => item.onSelect(editor, element, path)}>
                <Icon size="2" name={item.iconName as any} />
                {item.label}
              </Dropdown.Item>
            ))}
          </Dropdown.Content>
        </Dropdown.Root>
      ) : null}
      <Marker element={element} />
    </Tools>
  )
})

/*
 * @todo add correct types to builder function
 */
function setType(fn: any) {
  return function setToStatement(editor: MTTEditor, element: FlowContent, at: Path) {
    Editor.withoutNormalizing(editor, function () {
      const {children, type, ...props} = element
      Transforms.removeNodes(editor, {at})
      Transforms.insertNodes(editor, fn({...props}, children), {at})
    })
  }
}
