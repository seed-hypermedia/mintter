import type {MTTEditor} from './utils'
import type {FlowContent, Statement} from '@mintter/mttast'
import {Icon} from '@mintter/ui/icon'
import {styled} from '@mintter/ui/stitches.config'
import {Marker} from './marker'
import {Dropdown} from './dropdown'
import {Text} from '@mintter/ui/text'
import {useSlateStatic} from 'slate-react'
import {ReactEditor} from 'slate-react'
import {Transforms, Editor, Path} from 'slate'
import {blockquote, code, heading, statement} from '@mintter/mttast-builder'
import {useReadOnly} from 'slate-react'
import {Box} from '@mintter/ui/box'

export const Tools = styled('div', {
  height: '100%',
  alignSelf: 'start',
  display: 'flex',
  // alignItems: 'center',
  userSelect: 'none',
  WebkitUserSelect: 'none',
  transition: 'all ease-in-out 0.1s',
  flexDirection: 'row-reverse',
  width: '$space$8',
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

export const ElementDropdown = styled('button', {
  border: 'none',
  backgroundColor: '$background-default',
  width: '$space$8',
  display: 'flex',
  alignItems: 'center',
  zIndex: 2,
  justifyContent: 'center',
  // height: 32,
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

export function StatementTools({element}: {element: FlowContent}) {
  const editor = useSlateStatic()
  const isReadOnly = useReadOnly()
  const path = ReactEditor.findPath(editor, element)

  return (
    <Tools contentEditable={false}>
      <Marker element={element} />
      {!isReadOnly ? (
        <Dropdown.Root modal={false}>
          <Dropdown.Trigger as={ElementDropdown} data-trigger>
            <Icon name="Grid4" size="2" color="muted" />
          </Dropdown.Trigger>
          <Dropdown.Content portalled align="start" side="bottom" css={{minWidth: 220}}>
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
    </Tools>
  )
}

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
