import type {FlowContent, Statement} from '@mintter/mttast'
import {Icon, icons} from '@mintter/ui/icon'
import {styled} from '@mintter/ui/stitches.config'
import {isGroupContent} from '@mintter/mttast'
import {Marker} from './marker'
import {Dropdown} from './dropdown'
import {Text} from '@mintter/ui/text'
import {useSlateStatic} from 'slate-react'
import {ReactEditor} from 'slate-react'
import {Transforms, Editor, Path, Node} from 'slate'
import {blockquote, code, group, heading, ol, statement, ul} from '@mintter/mttast-builder'
import {useReadOnly} from 'slate-react'
import {Box} from '@mintter/ui/box'
import {Fragment} from 'react'

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
  height: '$space$8',
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

const items: {
  [key: string]: Array<{
    label: string
    iconName: keyof typeof icons
    onSelect: (editor: Editor, element: FlowContent, at: Path) => void
  }>
} = {
  statement: [
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
  ],
  group: [
    {
      label: 'Bullet List',
      iconName: 'BulletList',
      onSelect: setList(ul),
    },
    {
      label: 'Ordered List',
      iconName: 'OrderedList',
      onSelect: setList(ol),
    },
    {
      label: 'Plain List',
      iconName: 'List',
      onSelect: setList(group),
    },
  ],
}

export function StatementTools({element}: {element: FlowContent}) {
  const editor = useSlateStatic()
  const isReadOnly = useReadOnly()
  const path = ReactEditor.findPath(editor, element)

  return (
    <Tools contentEditable={false}>
      <Marker element={element} />
      {!isReadOnly ? (
        <Dropdown.Root>
          <Dropdown.Trigger as={ElementDropdown} data-trigger>
            <Icon name="Grid4" size="2" color="muted" />
          </Dropdown.Trigger>
          <Dropdown.Content portalled align="start" side="bottom" css={{minWidth: 220}}>
            {Object.entries(items).map(([key, value], index, arr) => {
              return (
                <Fragment key={key}>
                  <Dropdown.Label>
                    <Text color="muted" size="2" css={{marginHorizontal: '$3', marginVertical: '$2'}}>
                      Turn {key} into:
                    </Text>
                  </Dropdown.Label>
                  {value.map((item) => (
                    <Dropdown.Item key={item.label} onSelect={() => item.onSelect(editor, element, path)}>
                      <Icon size="2" name={item.iconName} />
                      {item.label}
                    </Dropdown.Item>
                  ))}
                  {arr.length > index + 1 && <Dropdown.Separator />}
                </Fragment>
              )
            })}
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
  return function setToStatement(editor: Editor, element: FlowContent, at: Path) {
    Editor.withoutNormalizing(editor, function () {
      const {children, type, ...props} = element
      Transforms.removeNodes(editor, {at})
      Transforms.insertNodes(editor, fn({...props}, children), {at})
    })
  }
}

function setList(fn: any) {
  return function wrapWithListType(editor: Editor, element: FlowContent, at: Path) {
    const list = Node.parent(editor, at)

    if (list && isGroupContent(list)) {
      Editor.withoutNormalizing(editor, () => {
        const {children} = list
        Transforms.removeNodes(editor, {at: Path.parent(at)})
        Transforms.insertNodes(editor, fn(children), {at: Path.parent(at)})
      })
    }
  }
}
