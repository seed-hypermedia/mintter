/* eslint-disable @typescript-eslint/no-empty-function */
import {useNavigate, useNavRoute} from '@app/utils/navigation'
import {TitleBarProps} from '@components/titlebar'
import {
  AddSquare,
  ButtonText,
  Close,
  CloseAll,
  Code,
  Copy,
  Cut,
  Delete,
  Emphasis,
  HeadingIcon,
  Hide,
  Info,
  ListItem,
  ListItemProps,
  Paste,
  Redo,
  Search,
  SelectAll,
  Settings,
  Stack,
  Statement,
  Strikethrough,
  Strong,
  Subscript,
  Superscript,
  Text,
  TitlebarRow,
  TitlebarSection,
  TitlebarWrapper,
  Underline,
  Undo,
  XStack,
  YGroup,
  BlockQuote,
  CodeBlock,
  UnorderedList,
  OrderedList,
  GroupIcon,
  Reload,
  Documentation,
  ReleaseNotes,
  Acknowledgements,
  Container,
} from '@mintter/ui'
import * as NavigationMenu from '@radix-ui/react-navigation-menu'
import {invoke, send} from '@app/ipc'
import {getCurrent} from '@tauri-apps/api/window'
import {useEffect, useMemo} from 'react'
import {ActionButtons, NavigationButtons, NavMenu} from './common'
import {MintterIcon} from '../mintter-icon'
import {Title} from './title'
import {
  CloseButton,
  MaximizeOrRestoreButton,
  MinimizeButton,
} from './window-controls'

export default function TitleBarWindows(props: TitleBarProps) {
  // in the settings window we render a stripped down version of the titlebar
  if (props.clean) {
    return (
      <TitlebarWrapper data-tauri-drag-region>
        <TitlebarRow data-tauri-drag-region>
          <TitlebarSection data-tauri-drag-region>
            <MintterIcon />
          </TitlebarSection>
          <TitlebarSection
            flex={1}
            alignItems="center"
            justifyContent="flex-end"
            data-tauri-drag-region
          >
            <XStack>
              <CloseButton />
            </XStack>
          </TitlebarSection>
        </TitlebarRow>
      </TitlebarWrapper>
    )
  }

  return (
    <TitlebarWrapper data-tauri-drag-region>
      <TitlebarRow
        minHeight={28}
        backgroundColor="$color3"
        data-tauri-drag-region
      >
        <TitlebarSection data-tauri-drag-region flex={1}>
          <MintterIcon />
          <SystemMenu />
        </TitlebarSection>
        <TitlebarSection gap={0} data-tauri-drag-region>
          <XStack>
            <MinimizeButton />
            <MaximizeOrRestoreButton />
            <CloseButton />
          </XStack>
        </TitlebarSection>
      </TitlebarRow>
      <XStack justifyContent="space-between" data-tauri-drag-region>
        <XStack
          flex={1}
          minWidth={'min-content'}
          flexBasis={0}
          alignItems="center"
          data-tauri-drag-region
        >
          <Container
            alignItems="flex-start"
            data-tauri-drag-region
            paddingHorizontal={0}
            paddingVertical="$1"
          >
            <XStack data-tauri-drag-region>
              <NavigationButtons />
            </XStack>
          </Container>
        </XStack>
        <XStack flex={1} alignItems="center" data-tauri-drag-region>
          <Title size="$2" />
        </XStack>
        <XStack
          data-tauri-drag-region
          flex={1}
          justifyContent="flex-end"
          minWidth={'min-content'}
          flexBasis={0}
          alignItems="center"
          backgroundColor="$color1"
        >
          <ActionButtons {...props} />
        </XStack>
      </XStack>
    </TitlebarWrapper>
  )
}

function SystemMenu() {
  const route = useNavRoute()
  const editingDisabled = route.key != 'draft'
  const spawn = useNavigate('spawn')

  const menuItems: Array<MenuItemElement> = useMemo(
    () => [
      {
        id: 'mintter',
        title: 'Mintter',
        children: [
          {
            id: 'about',
            title: 'About Mintter',
            onSelect: () => invoke('open_about'),
            icon: Info,
          },
          {
            id: 'preferences',
            title: 'Preferences...',
            accelerator: 'Ctrl+,',
            onSelect: () => spawn({key: 'settings'}),
            icon: Settings,
          },
          {
            id: 'hide',
            title: 'Hide',
            accelerator: 'Ctrl+H',
            onSelect: () => getCurrent().hide(),
            icon: Hide,
          },
          {
            id: 'quit',
            title: 'Quit Mintter',
            onSelect: () => process.exit(0),
            icon: Delete,
          },
        ],
      },
      {
        title: 'File',
        id: 'file',
        children: [
          {
            id: 'newwindow',
            title: 'New Window',
            accelerator: 'Ctrl+N',
            onSelect: () => spawn({key: 'home'}),
            icon: AddSquare,
          },
          {
            id: 'close',
            title: 'Close',
            accelerator: 'Ctrl+F4',
            onSelect: () => getCurrent().close(),
            icon: Close,
          },
          {
            id: 'closeallwindows',
            title: 'Close all Window',
            accelerator: 'Ctrl+Shift+Alt+W',
            onSelect: () => invoke('close_all_windows'),
            icon: CloseAll,
          },
        ],
      },
      {
        title: 'Edit',
        id: 'edit',
        disabled: editingDisabled,
        children: [
          {
            id: 'undo',
            title: 'Undo',
            accelerator: 'Ctrl+Z',
            onSelect: () => {
              // TODO: implement me
            },
            icon: Undo,
            disabled: editingDisabled,
          },
          {
            id: 'redo',
            title: 'Redo',
            accelerator: 'Ctrl+Shift+Z',
            onSelect: () => {
              // TODO: implement me
            },
            icon: Redo,
            disabled: true,
          },
          {
            id: 'copy',
            title: 'Copy',
            accelerator: 'Ctrl+C',
            onSelect: () => {
              // TODO: implement me
            },
            icon: Copy,
            // TODO: send event when there's a selected text that the user can select
            disabled: true,
          },
          {
            id: 'cut',
            title: 'Cut',
            accelerator: 'Ctrl+X',
            onSelect: () => {
              // TODO: implement me
            },
            icon: Cut,
            // TODO: send event when there's a selected text that the user can
            disabled: true,
          },
          {
            id: 'paste',
            title: 'Paste',
            accelerator: 'Ctrl+V',
            onSelect: () => {
              // TODO: implement me
            },
            icon: Paste,
            // TODO: send event when the clipboard is not empty
            disabled: true,
          },
          {
            id: 'selectall',
            title: 'Select All',
            accelerator: 'Ctrl+A',
            onSelect: () => {
              // TODO: implement me: send an event to select all the text
            },
            icon: SelectAll,
            disabled: editingDisabled,
          },
          // {
          //   id: 'find',
          //   title: 'Find...',
          //   accelerator: 'Ctrl+F',
          //   onSelect: () => {
          //     // TODO: implement me
          //   },
          //   icon: Search,
          // },
        ],
      },
      {
        id: 'format',
        title: 'Format',
        disabled: editingDisabled,
        children: [
          {
            id: 'strong',
            title: 'Strong',
            accelerator: 'Ctrl+B',
            onSelect: () => send('format_mark', 'strong'),
            icon: Strong,
            disabled: true,
          },
          {
            id: 'emphasis',
            title: 'Emphasis',
            accelerator: 'Ctrl+I',
            onSelect: () => send('format_mark', 'emphasis'),
            icon: Emphasis,
            disabled: true,
          },
          {
            id: 'code',
            title: 'Code',
            accelerator: 'Ctrl+E',
            onSelect: () => send('format_mark', 'code'),
            icon: Code,
            disabled: true,
          },
          {
            id: 'underline',
            title: 'Underline',
            accelerator: 'Ctrl+U',
            onSelect: () => send('format_mark', 'underline'),
            icon: Underline,
            disabled: true,
          },
          {
            id: 'strikethrough',
            title: 'Strikethrough',
            onSelect: () => send('format_mark', 'strikethrough'),
            icon: Strikethrough,
            disabled: true,
          },
          {
            id: 'subscript',
            title: 'Subscript',
            onSelect: () => send('format_mark', 'subscript'),
            icon: Subscript,
            disabled: true,
          },
          {
            id: 'superscript',
            title: 'Superscript',
            onSelect: () => send('format_mark', 'superscript'),
            icon: Superscript,
            disabled: true,
          },
          {
            id: 'heading',
            title: 'Heading',
            onSelect: () => send('format_block', 'heading'),
            icon: HeadingIcon,
            disabled: true,
          },
          {
            id: 'statement',
            title: 'Statement',
            onSelect: () => send('format_block', 'heading'),
            icon: Statement,
            disabled: true,
          },
          {
            id: 'blockquote',
            title: 'Blockquote',
            onSelect: () => send('format_block', 'blockquote'),
            icon: BlockQuote,
            disabled: true,
          },
          {
            id: 'codeblock',
            title: 'Code Block',
            onSelect: () => send('format_block', 'codeblock'),
            icon: CodeBlock,
            disabled: true,
          },
          {
            id: 'unorderedlist',
            title: 'Unordered List',
            onSelect: () => send('format_block', 'unordered_list'),
            icon: UnorderedList,
            disabled: true,
          },
          {
            id: 'orderedlist',
            title: 'Ordered List',
            onSelect: () => send('format_block', 'ordered_list'),
            icon: OrderedList,
            disabled: true,
          },
          {
            id: 'group',
            title: 'Plain List',
            onSelect: () => send('format_block', 'group'),
            icon: GroupIcon,
            disabled: true,
          },
        ],
      },
      {
        id: 'view',
        title: 'View',
        children: [
          {
            id: 'reload',
            title: 'Reload',
            accelerator: 'Ctrl+R',
            onSelect: () => window.location.reload(),
            icon: Reload,
          },
          {
            id: 'quickswitcher',
            title: 'Quick Switcher',
            accelerator: 'Ctrl+K',
            onSelect: () => send('open_quick_switcher'),
            icon: Search,
          },
          {
            id: 'connections',
            title: 'Connections',
            accelerator: 'Ctrl+9',
            onSelect: () => {},
            icon: Reload,
          },
        ],
      },
      {
        id: 'help',
        title: 'Help',
        children: [
          {
            id: 'documentation',
            title: 'Documentation',
            onSelect: () => invoke('open_documentation'),
            icon: Documentation,
          },
          {
            id: 'releasenotes',
            title: 'Release Notes',
            onSelect: () => invoke('open_release_notes'),
            icon: ReleaseNotes,
          },
          {
            id: 'acknowledgements',
            title: 'Acknowledgements',
            onSelect: () => invoke('open_acknowledgements'),
            icon: Acknowledgements,
          },
        ],
      },
    ],
    [editingDisabled],
  )

  return (
    <NavigationMenu.Root asChild>
      <XStack margin={0} padding={0} position="relative" zIndex={1} gap="$4">
        <NavigationMenu.List asChild>
          <XStack gap="$3">
            {menuItems.map((item) => (
              <NavigationMenu.Item key={item.id} asChild>
                <Stack>
                  <NavigationMenu.Trigger asChild>
                    <ButtonText size="$1">{item.title}</ButtonText>
                  </NavigationMenu.Trigger>
                  {item.children.length ? (
                    <NavigationMenu.Content>
                      <NavigationMenu.Sub>
                        <NavigationMenu.List asChild>
                          <YGroup bordered position="absolute" minWidth={200}>
                            {item.children.map((p) => (
                              <MenuItem
                                disabled={p.disabled}
                                key={p.id}
                                {...p}
                                onSelect={p.onSelect}
                              />
                            ))}
                          </YGroup>
                        </NavigationMenu.List>
                      </NavigationMenu.Sub>
                    </NavigationMenu.Content>
                  ) : null}
                </Stack>
              </NavigationMenu.Item>
            ))}
          </XStack>
        </NavigationMenu.List>
      </XStack>
    </NavigationMenu.Root>
  )
}

function MenuItem(props: {
  title: string
  accelerator?: string
  disabled?: boolean
  onSelect: () => void
  icon: ListItemProps['icon']
}) {
  useEffect(() => {
    if (props.accelerator) {
      const keys = props.accelerator.split('+')

      window.addEventListener('keyup', (e) => {
        if (
          keys.every((k) => {
            if (k === 'Alt') return e.altKey
            if (k === 'Shift') return e.shiftKey
            if (k === 'Ctrl') return e.ctrlKey
            k === e.key
          })
        ) {
          console.log(`triggered acc ${props.accelerator}!`)
        }
      })
    }
  }, [props.accelerator])

  return (
    <NavigationMenu.Item data-disabled={props.disabled} asChild>
      <YGroup.Item>
        <ListItem
          size="$2"
          icon={props.icon}
          hoverTheme
          hoverStyle={{
            cursor: 'pointer',
          }}
          pressTheme
          onPress={() => {
            console.log('CLICKED!')
            props.onSelect()
          }}
        >
          <Text fontFamily="$body" fontSize="$2" flex={1}>
            {props.title}
          </Text>
          {props.accelerator && (
            <Text fontFamily="$body" fontSize="$2" opacity={0.5}>
              {props.accelerator}
            </Text>
          )}
        </ListItem>
      </YGroup.Item>
    </NavigationMenu.Item>
  )
}

type MenuItemElement = {
  id: string
  title: string
  children: Array<SubMenuItemElement>
}

type SubMenuItemElement = {
  id: string
  title: string
  onSelect: () => void
  icon: ListItemProps['icon']
  accelerator?: string
  disabled?: boolean
}
