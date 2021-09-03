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
import {blockquote, code, heading, statement} from 'frontend/mttast-builder/dist'
import {useReadOnly} from 'slate-react'

export const Tools = styled('div', {
  height: '100%',
  overflow: 'hidden',
  alignSelf: 'start',
  display: 'flex',
  alignItems: 'center',
  userSelect: 'none',
  WebkitUserSelect: 'none',
})

export const Dragger = styled('div', {
  // backgroundColor: 'red',
  width: '$space$8',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  height: 32,
  borderRadius: '$2',
  opacity: 0,
  transition: 'all ease-in-out 0.1s',
  '&:hover': {
    opacity: 1,
    cursor: 'grab',
  },
})

const items = [
  {
    label: 'Statement',
    iconName: 'Paragraph',
    onSelect: setToStatement,
  },
  {
    label: 'Heading',
    iconName: 'Heading',
    onSelect: setToHeading,
  },
  {
    label: 'Blockquote',
    iconName: 'MessageBubble',
    onSelect: setToBlockquote,
  },
  {
    label: 'Code block',
    iconName: 'AddCircle',
    onSelect: setCodeblock,
  },
]

export const StatementTools = forwardRef(({element}: {element: FlowContent}, ref) => {
  const editor = useSlateStatic()
  const isReadOnly = useReadOnly()
  const path = ReactEditor.findPath(editor, element)
  return (
    !isReadOnly && (
      <Tools contentEditable={false} ref={ref}>
        <Dropdown.Root>
          <Dropdown.Trigger as={Slot}>
            <Dragger data-dragger>
              <Icon name="AddCircle" size="2" color="muted" />
            </Dragger>
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
        <Marker element={element} />
      </Tools>
    )
  )
})

function setToStatement(editor: MTTEditor, element: FlowContent, at: Path) {
  Editor.withoutNormalizing(editor, function () {
    const {children, type, ...props} = element
    Transforms.removeNodes(editor, {at})
    Transforms.insertNodes(editor, statement({...props}, children), {at})
  })
}

function setToHeading(editor: MTTEditor, element: FlowContent, at: Path) {
  Editor.withoutNormalizing(editor, function () {
    const {children, type, ...props} = element
    Transforms.removeNodes(editor, {at})
    Transforms.insertNodes(editor, heading({...props}, children), {at})
  })
}

function setToBlockquote(editor: MTTEditor, element: FlowContent, at: Path) {
  Editor.withoutNormalizing(editor, function () {
    const {children, type, ...props} = element
    Transforms.removeNodes(editor, {at})
    Transforms.insertNodes(editor, blockquote({...props}, children), {at})
  })
}

function setCodeblock(editor: MTTEditor, element: FlowContent, at: Path) {
  Editor.withoutNormalizing(editor, function () {
    const {children, type, ...props} = element
    Transforms.removeNodes(editor, {at})
    Transforms.insertNodes(editor, code({...props}, children), {at})
  })
}
