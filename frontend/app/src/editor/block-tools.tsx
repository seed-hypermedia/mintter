import { hoverModel } from '@app/editor/hover-machine'
import { findPath } from '@app/editor/utils'
import { styled } from '@app/stitches.config'
import { ObjectKeys } from '@app/utils/object-keys'
import { Box } from '@components/box'
import { Icon, icons } from '@components/icon'
import { Text } from '@components/text'
import {
  blockquote,
  code,
  group,
  heading,
  isGroupContent,
  isHeading,
  MttastContent,
  ol,
  statement,
  ul
} from '@mintter/mttast'
import { useActor } from '@xstate/react'
import { Fragment } from 'react'
import { BaseRange, Editor, Node, Path, Transforms } from 'slate'
import { RenderElementProps, useSlateStatic } from 'slate-react'
import { Dropdown } from './dropdown'
import { useHover } from './hover-context'
import { ELEMENT_PARAGRAPH } from './paragraph'

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
  '[data-element-type="blockquote"] &': {
    left: '-$7',
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

type BlockToolsProps = {
  element: RenderElementProps['element'];
}

export function BlockTools({ element }: BlockToolsProps) {
  const editor = useSlateStatic()
  const hoverService = useHover()
  const [state, hoverSend] = useActor(hoverService)
  const path = findPath(element)

  return (
    <Box
      contentEditable={false}
      css={{
        width: '$space$8',
        height: '$space$8',
        position: 'absolute',
        top: '$5',
        left: '-$5',
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
          hoverSend(hoverModel.events['MOUSE_ENTER'](element.id))
        }}
      />
      {state.context.blockId == element.id && (
        <Dropdown.Root modal={false}>
          <Dropdown.Trigger asChild>
            <ElementDropdown data-trigger>
              <Icon name="Grid4" size="2" color="muted" />
            </ElementDropdown>
          </Dropdown.Trigger>
          <Dropdown.Content portalled align="start" side="bottom" css={{ minWidth: 220 }}>
            {Object.entries(items).map(([key, value], index, arr) => {
              return (
                <Fragment key={key}>
                  <Dropdown.Label>
                    <Text color="muted" size="2" css={{ marginHorizontal: '$3', marginVertical: '$2' }}>
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
  )
}

/* eslint-disable */
function setType(fn: any) {
  return function setToStatementType(editor: Editor, element: MttastContent, at: Path) {
    Editor.withoutNormalizing(editor, function () {
      const keys = ObjectKeys(element).filter((key) => !['type', 'id', 'children', 'data'].includes(key))

      if (isHeading(element)) {
        Transforms.setNodes(editor, { type: ELEMENT_PARAGRAPH }, { at: [...at, 0] })
      }

      if (keys.length) {
        Transforms.unsetNodes(editor, keys, { at })
      }

      // IDs are meant to be stable, so we shouldn't obverride it
      const { id, ...props } = fn()

      Transforms.setNodes(editor, props, { at })
    })
  }
}

/* eslint-disable */
function setList(fn: any) {
  return function wrapWithListType(editor: Editor, element: MttastContent, at: Path) {
    const list = Node.parent(editor, at)

    if (list && isGroupContent(list)) {
      Editor.withoutNormalizing(editor, () => {
        const { children } = list
        Transforms.removeNodes(editor, { at: Path.parent(at) })
        Transforms.insertNodes(editor, fn(children), { at: Path.parent(at) })
      })
    }
  }
}
