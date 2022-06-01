import {changesService} from '@app/editor/mintter-changes/plugin'
import {findPath} from '@app/editor/utils'
import {ObjectKeys} from '@app/utils/object-keys'
import {Box} from '@components/box'
import {Icon, icons} from '@components/icon'
import {Text} from '@components/text'
import {
  blockquote,
  code,
  FlowContent,
  group,
  heading,
  isFlowContent,
  isGroupContent,
  isHeading,
  MttastContent,
  ol,
  statement,
  ul,
} from '@mintter/mttast'
import {useActor} from '@xstate/react'
import {Fragment} from 'react'
import {BaseRange, Editor, Node, Path, Transforms} from 'slate'
import {useSlateStatic} from 'slate-react'
import {Dropdown, ElementDropdown} from './dropdown'
import {useHover} from './hover-context'
import {ELEMENT_PARAGRAPH} from './paragraph'

const items: {
  [key: string]: Array<{
    label: string
    iconName: keyof typeof icons
    onSelect: (
      editor: Editor,
      element: FlowContent,
      at: Path,
      lastSelection: BaseRange | null,
    ) => void
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
  element: FlowContent
}

export function BlockTools({element}: BlockToolsProps) {
  const editor = useSlateStatic()
  const hoverService = useHover()
  const [, hoverSend] = useActor(hoverService)
  const path = findPath(element)

  return (
    <Box
      contentEditable={false}
      className="DEBUGME"
      css={{
        opacity: 0,
        pointerEvents: 'none',
        [`[data-hover-block="${element.id}"] &`]: {
          opacity: 1,
          pointerEvents: 'all',
        },
        '&:hover': {
          cursor: 'pointer',
        },
      }}
    >
      <Box
        onMouseEnter={() => {
          hoverSend({type: 'MOUSE_ENTER', blockId: element.id})
        }}
      />

      <Dropdown.Root modal={false}>
        <Dropdown.Trigger asChild>
          <ElementDropdown data-trigger contentEditable={false}>
            <Icon name="Grid4" size="2" color="muted" />
          </ElementDropdown>
        </Dropdown.Trigger>
        <Dropdown.Content portalled align="start" side="bottom">
          {Object.entries(items).map(([key, value], index, arr) => {
            return (
              <Fragment key={key}>
                <Dropdown.Label>
                  <Text color="muted" size="2" css={{padding: '$3'}}>
                    Turn {key} into:
                  </Text>
                </Dropdown.Label>
                {value.map((item) => (
                  <Dropdown.Item
                    data-testid={`item-${item.label}`}
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
    </Box>
  )
}

/* eslint-disable */
function setType(fn: any) {
  return function setToStatementType(
    editor: Editor,
    element: FlowContent,
    at: Path,
  ) {
    Editor.withoutNormalizing(editor, function () {
      changesService.addChange(['replaceBlock', element.id])
      const keys = ObjectKeys(element).filter(
        (key) => !['type', 'id', 'children', 'data'].includes(key),
      )

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
  return function wrapWithListType(
    editor: Editor,
    element: MttastContent,
    at: Path,
  ) {
    const list = Node.parent(editor, at)

    if (list && isGroupContent(list)) {
      Editor.withoutNormalizing(editor, () => {
        const {children} = list
        Transforms.removeNodes(editor, {at: Path.parent(at)})
        Transforms.insertNodes(editor, fn(children), {at: Path.parent(at)})

        if (at.length == 2) {
          // block is at the root level
        } else {
          let parentBlockEntry = Editor.above(editor, {
            match: isFlowContent,
            at,
          })
          if (parentBlockEntry) {
            let [block] = parentBlockEntry
            changesService.addChange(['replaceBlock', block.id])
          }
        }
      })
    }
  }
}
