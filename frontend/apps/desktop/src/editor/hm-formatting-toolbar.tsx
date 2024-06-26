import {
  BlockNoteEditor,
  BlockSchema,
  BlockTypeDropdownItem,
  DefaultBlockSchema,
  FormattingToolbarProps,
} from './blocknote'

import { ToggledStyle } from '@shm/shared'
import {
  Button,
  Check,
  ChevronDown,
  Code,
  Emphasis,
  HeadingIcon,
  OrderedList,
  Select,
  SizeTokens,
  Strikethrough,
  Strong,
  Theme,
  Tooltip,
  Underline,
  UnorderedList,
  XGroup,
  XStack,
} from '@shm/ui'
import { Type } from '@tamagui/lucide-icons'
import { useMemo, useState } from 'react'
import {
  HMBlockSchema,
  useEditorContentChange,
  useEditorSelectionChange,
} from '.'
import { ToolbarDropdownItemProps } from './blocknote/react/SharedComponents/Toolbar/components/ToolbarDropdownItem'
import { HMLinkToolbarButton } from './hm-toolbar-link-button'
// import {TextAlignButton} from './DefaultButtons/TextAlignButton'
// import {ColorStyleButton} from './DefaultButtons/ColorStyleButton'

const size: SizeTokens = '$3'

const toggleStyles = [
  {
    name: 'Strong (Mod+B)',
    icon: Strong,
    style: 'bold' as ToggledStyle,
  },
  {
    name: 'Emphasis (Mod+I)',
    icon: Emphasis,
    style: 'italic' as ToggledStyle,
  },
  {
    name: 'Underline (Mod+U)',
    icon: Underline,
    style: 'underline' as ToggledStyle,
  },
  {
    name: 'Strikethrough (Mod+Shift+X)',
    icon: Strikethrough,
    style: 'strike' as ToggledStyle,
  },
  {
    name: 'Code (Mod+E)',
    icon: Code,
    style: 'code' as ToggledStyle,
  },
]

export const blockDropdownItems: BlockTypeDropdownItem[] = [
  {
    name: 'Paragraph',
    type: 'paragraph',
    icon: Type,
  },
  {
    name: 'Heading',
    type: 'heading',
    icon: HeadingIcon,
  },
  {
    name: 'Bullet List',
    type: 'bulletListItem',
    icon: UnorderedList,
  },
  {
    name: 'Numbered List',
    type: 'numberedListItem',
    icon: OrderedList,
  },
]

export function HMFormattingToolbar(
  props: FormattingToolbarProps<HMBlockSchema> & {
    blockTypeDropdownItems?: BlockTypeDropdownItem[]
  },
) {
  // return <XStack bg="red" ref={currentRef} width={200} height={10} />
  return (
    <XStack>
      <XGroup elevation="$5" bg="red" paddingHorizontal={0} x={-40}>
        {/* <BlockTypeToolbarDropdown
          editor={props.editor}
          items={props.blockTypeDropdownItems}
        /> */}
        {toggleStyles.map((item) => (
          <ToggleStyleButton
            key={item.style}
            editor={props.editor}
            toggleStyle={item.style}
            {...item}
          />
        ))}
        <HMLinkToolbarButton editor={props.editor} size={size} />
      </XGroup>
    </XStack>
  )
}

function ToggleStyleButton({
  editor,
  toggleStyle,

  name,
  icon,
}: {
  editor: BlockNoteEditor<HMBlockSchema>
  toggleStyle: ToggledStyle
  name: string
  icon: any
}) {
  const [active, setActive] = useState<boolean>(
    toggleStyle in editor.getActiveStyles(),
  )

  function toggleCurrentStyle() {
    setActive(toggleStyle in editor.getActiveStyles())
  }

  useEditorContentChange(editor, toggleCurrentStyle)
  useEditorSelectionChange(editor, toggleCurrentStyle)

  function handlePress(style: ToggledStyle) {
    editor.focus()
    editor.toggleStyles({ [toggleStyle]: true })
  }

  return (
    <Theme inverse={active}>
      <XGroup.Item>
        <Tooltip content={name}>
          <Button
            bg={active ? '$background' : '$backgroundFocus'}
            fontWeight={active ? 'bold' : '400'}
            size={size}
            borderRadius={0}
            icon={icon}
            onPress={() => handlePress(toggleStyle)}
          />
        </Tooltip>
      </XGroup.Item>
    </Theme>
  )
}

const BlockTypeToolbarDropdown = <
  BSchema extends BlockSchema = DefaultBlockSchema,
>({
  editor,
  items,
}: {
  editor: BlockNoteEditor<BSchema>
  items?: BlockTypeDropdownItem[]
}) => {
  const [block, setBlock] = useState(() => editor.getTextCursorPosition().block)

  const filteredItems: BlockTypeDropdownItem[] = useMemo(() => {
    return (items || blockDropdownItems).filter((item) => {
      // Checks if block type exists in the schema
      if (!(item.type in editor.schema)) {
        return false
      }

      // Checks if props for the block type are valid
      for (const [prop, value] of Object.entries(item.props || {})) {
        const propSchema = editor.schema[item.type].propSchema

        // Checks if the prop exists for the block type
        if (!(prop in propSchema)) {
          return false
        }

        // Checks if the prop's value is valid
        if (
          propSchema[prop].values !== undefined &&
          !propSchema[prop].values!.includes(value)
        ) {
          return false
        }
      }

      return true
    })
  }, [editor, items])

  const shouldShow: boolean = useMemo(
    () => filteredItems.find((item) => item.type == block.type) != undefined,
    [block.type, filteredItems],
  )

  const fullItems: ToolbarDropdownItemProps[] = useMemo(
    () =>
      filteredItems.map((item) => ({
        text: item.name,
        icon: item.icon,
        isDisabled: block.type == item.type,
        type: item.type,
      })),
    [block, filteredItems, editor],
  )

  function updateBlock() {
    setBlock(editor.getTextCursorPosition().block)
  }

  useEditorContentChange(editor, updateBlock)

  useEditorSelectionChange(editor, updateBlock)

  if (!shouldShow) {
    return null
  }

  return (
    <XGroup.Item>
      <Select
        value={block.type}
        size="$2"
        onmasterValueChange={(newVal) => {
          editor.focus()
          editor.updateBlock(block, {
            type: newVal,
            props: {},
          })
        }}
      >
        <Select.Trigger
          width={140}
          borderColor="$colorTransparent"
          bg="$backgroundFocus"
          borderRadius={0}
          borderWidth={2}
        >
          <Select.Value placeholder="block type" paddingHorizontal="$2" />
          <ChevronDown size={12} />
        </Select.Trigger>
        <Select.Content>
          <Select.Viewport>
            {fullItems.map((item, index) => (
              <Select.Item key={item.text} index={index} value={item.type}>
                <Select.ItemText paddingHorizontal="$4">
                  {item.text}
                </Select.ItemText>
                <Select.ItemIndicator marginLeft="auto">
                  <Check size={16} />
                </Select.ItemIndicator>
              </Select.Item>
            ))}
          </Select.Viewport>
        </Select.Content>
      </Select>
    </XGroup.Item>
  )
}

// const HMBlockTypeDropdown({editor}: {
//   editor
// }) {
//  const [block, setBlock] = useState(() => editor.getTextCursorPosition().block)

//  const filteredItems: BlockTypeDropdownItem
// }
