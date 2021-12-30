import {FlowContent, isGroupContent, isHeading, MttastContent} from '@mintter/mttast'
import {blockquote, code, group, heading, ol, statement, ul} from '@mintter/mttast-builder'
import {Box} from '@mintter/ui/box'
import {Icon, icons} from '@mintter/ui/icon'
import {styled} from '@mintter/ui/stitches.config'
import {Text} from '@mintter/ui/text'
import {useActor} from '@xstate/react'
import {Fragment} from 'react'
import {BaseRange, Editor, Node, Path, Transforms} from 'slate'
import {ReactEditor, useSlateStatic} from 'slate-react'
import {Dropdown} from './dropdown'
import {useHover} from './hover-context'
import {ELEMENT_PARAGRAPH} from './paragraph'
import {EditorMode} from './plugin-utils'

const ElementDropdown = styled('button', {
  border: 'none',
  backgroundColor: '$background-alt',
  position: 'absolute',
  zIndex: 2,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  borderRadius: '$2',
  transition: 'all ease-in-out 0.1s',
  '[data-element-type="heading"] &': {
    marginTop: '$3',
  },
  '[data-element-type="code"] &': {
    marginTop: '$4',
  },
  '&:hover': {
    cursor: 'pointer',
  },
})

const items: {
  [key: string]: Array<{
    label: string
    iconName: keyof typeof icons
    onSelect: (editor: Editor, element: MttastContent, at: Path, lastSelection: BaseRange | null) => void
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

export function BlockTools({element}: {element: FlowContent}) {
  const hoverService = useHover()
  const [state, hoverSend] = useActor(hoverService)
  const editor = useSlateStatic()
  const path = ReactEditor.findPath(editor, element)

  return editor.mode == EditorMode.Draft ? (
    <Box
      contentEditable={false}
      css={{
        width: '$space$8',
        height: '$space$8',
        position: 'absolute',
        top: 2,
        left: '-$8',
        marginLeft: '-$3',
        userSelect: 'none',
        WebkitUserSelect: 'none',
        '&:hover': {
          cursor: 'pointer',
        },
      }}
    >
      <Box
        css={{
          position: 'absolute',
          width: 80,
          height: '150%',
          top: 0,
          left: '50%',
          zIndex: 0,
          userSelect: 'none',
          WebkitUserSelect: 'none',
          transform: 'translate(-50%, 0)',
        }}
        onMouseEnter={() => {
          hoverSend({type: 'MOUSE_ENTER', blockId: element.id})
        }}
      />
      {state.context.blockId == element.id && (
        <Dropdown.Root modal={false}>
          <Dropdown.Trigger asChild>
            <ElementDropdown data-trigger>
              <Icon name="Grid4" size="2" color="muted" />
            </ElementDropdown>
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
                    <Dropdown.Item
                      key={item.label}
                      onSelect={() => {
                        item.onSelect(editor, element, path, editor.selection)
                      }}
                    >
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
      )}
    </Box>
  ) : null
}

/* eslint-disable */
function setType(fn: any) {
  return function setToStatementType(editor: Editor, element: MttastContent, at: Path) {
    Editor.withoutNormalizing(editor, function () {
      const keys = Object.keys(element).filter((key) => !['type', 'id', 'children', 'data'].includes(key))

      if (isHeading(element)) {
        Transforms.setNodes(editor, {type: ELEMENT_PARAGRAPH}, {at: [...at, 0]})
      }

      if (keys.length) {
        Transforms.unsetNodes(editor, keys, {at})
      }

      // IDs are meant to be stable, so we shouldn't obverride it
      const {id, ...props} = fn()

      Transforms.setNodes(editor, props, {at})
    })
  }
}

/* eslint-disable */
function setList(fn: any) {
  return function wrapWithListType(editor: Editor, element: MttastContent, at: Path) {
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
