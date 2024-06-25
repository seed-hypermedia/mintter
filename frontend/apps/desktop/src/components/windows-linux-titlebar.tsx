import {useIPC, useWindowUtils} from '@/app-context'
import {WindowsLinuxWindowControls} from '@/components/window-controls'
import {useNavRoute, useNavigationDispatch} from '@/utils/navigation'
import {useOpenDraft} from '@/utils/open-draft'
import {defaultRoute} from '@/utils/routes'
import {useNavigate} from '@/utils/useNavigate'
import {useTriggerWindowEvent} from '@/utils/window-events'
import {
  AddSquare,
  Button,
  Close,
  CloseAll,
  Delete,
  Draft,
  Hide,
  ListItem,
  ListItemProps,
  Popover,
  Reload,
  Search,
  Separator,
  Settings,
  SizableText,
  TitlebarRow,
  TitlebarSection,
  TitlebarWrapper,
  XStack,
  YGroup,
} from '@shm/ui'
import {Contact, FileText, Library} from '@tamagui/lucide-icons'
import {useMemo} from 'react'

export function WindowsLinuxTitleBar({
  left,
  title,
  right,
}: {
  title: React.ReactNode
  left?: React.ReactNode
  right?: React.ReactNode
}) {
  return (
    <TitlebarWrapper className="window-drag" style={{flex: 'none'}}>
      <TitlebarRow minHeight={28} backgroundColor="$color3">
        <TitlebarSection>
          <SystemMenu />
        </TitlebarSection>
        <XStack flex={1} />
        <TitlebarSection space>
          <WindowsLinuxWindowControls />
        </TitlebarSection>
      </TitlebarRow>
      <TitlebarRow>
        <XStack
          flex={1}
          minWidth={'min-content'}
          flexBasis={0}
          alignItems="center"
          className="window-drag"
        >
          {left}
        </XStack>
        <XStack
          f={1}
          alignItems="center"
          justifyContent="center"
          pointerEvents="none"
          height="100%"
          ai="center"
          jc="center"
        >
          {title}
        </XStack>
        <XStack
          flex={1}
          justifyContent="flex-end"
          minWidth={'min-content'}
          flexBasis={0}
          className="window-drag"
          alignItems="center"
        >
          {right}
        </XStack>
      </TitlebarRow>
    </TitlebarWrapper>
  )
}

export function SystemMenu() {
  const createDraft = useOpenDraft('spawn')
  const {hide, close, quit} = useWindowUtils()
  const spawn = useNavigate('spawn')
  const push = useNavigate('push')
  const navDispatch = useNavigationDispatch()
  const route = useNavRoute()
  const triggerFocusedWindow = useTriggerWindowEvent()
  const {invoke} = useIPC()
  const menuItems: Array<MenuItemElement> = useMemo(
    () => [
      {
        id: 'seed',
        title: 'Seed',
        children: [
          {
            id: 'preferences',
            title: 'Preferences...',
            accelerator: 'Ctrl+,',
            onSelect: () => spawn({key: 'settings'}),
            icon: Settings,
          },
          {
            id: 'quickswitcher',
            title: 'Search / Open',
            accelerator: 'Ctrl+K',
            onSelect: () => triggerFocusedWindow('openLauncher'),
            icon: Search,
          },
          {
            id: 'forcesync',
            title: 'Trigger sync with Peers',
            accelerator: 'Opt+Ctrl+R',
            onSelect: () => triggerFocusedWindow('triggerPeerSync'),
          },
          {
            id: 'hide',
            title: 'Hide',
            accelerator: 'Ctrl+H',
            onSelect: () => hide(),
            icon: Hide,
          },
          {
            id: 'quit',
            title: 'Quit Seed',
            onSelect: () => quit(),
            icon: Delete,
          },
        ],
      },
      {
        title: 'File',
        id: 'file',
        children: [
          {
            id: 'newdocument',
            title: 'New Document',
            accelerator: 'Ctrl+N',
            onSelect: () => createDraft(),
            icon: AddSquare,
          },
          {
            id: 'newwindow',
            title: 'New Window',
            accelerator: 'Ctrl+Shift+N',
            onSelect: () => spawn(defaultRoute),
            icon: AddSquare,
          },
          {
            id: 'close',
            title: 'Close Window  ',
            accelerator: 'Ctrl+F4',
            onSelect: () => close(),
            icon: Close,
          },
          {
            id: 'closeallwindows',
            title: 'Close all Windows',
            accelerator: 'Ctrl+Shift+Alt+W',
            onSelect: () => invoke('close_all_windows'),
            icon: CloseAll,
          },
        ],
      },
      // TODO: we need to pass the `editor` object to make all this actions possible: copy, cut, paste...
      // {
      //   id: 'edit',
      //   title: 'Edit',
      //   children: [
      //     {
      //       id: 'undo',
      //       title: 'Undo',
      //       accelerator: 'Ctrl+Z',
      //       disabled: true,
      //       onSelect: () => toast.error('Action Not implemented from the menu'),
      //     },
      //     {
      //       id: 'redo',
      //       title: 'Redo',
      //       accelerator: 'Ctrl+Shift+Z',
      //       disabled: true,
      //       onSelect: () => toast.error('Action Not implemented from the menu'),
      //     },
      //   ],
      // },
      {
        id: 'view',
        title: 'View',
        children: [
          {
            id: 'back',
            title: 'Back',
            accelerator: 'Ctrl+◀︎',
            onSelect: () => navDispatch({type: 'pop'}),
          },
          {
            id: 'forward',
            title: 'Forward',
            accelerator: 'Ctrl+▶︎',
            onSelect: () => navDispatch({type: 'forward'}),
          },
          {
            id: 'documents',
            title: 'Documents',
            accelerator: 'Ctrl+1',
            onSelect: () => push({key: 'documents'}),
            icon: FileText,
            disabled: route.key == 'documents',
          },
          {
            id: 'groups',
            title: 'Groups',
            accelerator: 'Ctrl+3',
            onSelect: () => push({key: 'groups'}),
            icon: Library,
            disabled: route.key == 'groups',
          },
          {
            id: 'drafts',
            title: 'Drafts',
            accelerator: 'Ctrl+8',
            onSelect: () => push({key: 'documents', tab: 'drafts'}),
            icon: Draft,
            disabled: route.key == 'documents' && route.tab === 'drafts',
          },
          {
            id: 'contacts',
            title: 'Contacts',
            accelerator: 'Ctrl+9',
            onSelect: () => push({key: 'contacts'}),
            icon: Contact,
            disabled: route.key == 'contacts',
          },
          {
            id: 'reload',
            title: 'Reload',
            accelerator: 'Ctrl+R',
            onSelect: () => window.location.reload(),
            icon: Reload,
          },
          {
            id: 'reload',
            title: 'Force Reload',
            accelerator: 'Ctrl+Shift+R',
            onSelect: () => window.location.reload(),
            icon: Reload,
          },
        ],
      },
    ],
    [
      createDraft,
      close,
      hide,
      invoke,
      spawn,
      triggerFocusedWindow,
      route.key,
      navDispatch,
      push,
    ],
  )

  return (
    <XStack className="no-window-drag" paddingLeft="$2">
      {menuItems.map((item) => (
        <Popover key={item.id} placement="bottom-start">
          <Popover.Trigger asChild>
            <Button
              size="$1"
              backgroundColor="transparent"
              borderRadius={0}
              paddingHorizontal="$2"
              fontWeight={item.id == 'seed' ? 'bold' : undefined}
            >
              {item.title}
            </Button>
          </Popover.Trigger>
          <Popover.Content
            className="no-window-drag"
            padding={0}
            elevation="$2"
            enterStyle={{y: -10, opacity: 0}}
            exitStyle={{y: -10, opacity: 0}}
            elevate
            animation={[
              'fast',
              {
                opacity: {
                  overshootClamping: true,
                },
              },
            ]}
          >
            <YGroup separator={<Separator />}>
              {item.children.map((p) => (
                <YGroup.Item key={p.id}>
                  <ListItem
                    className="no-window-drag"
                    icon={p.icon}
                    hoverTheme
                    pressTheme
                    hoverStyle={{
                      cursor: 'pointer',
                      backgroundColor: '$backgroundFocus',
                    }}
                    paddingHorizontal="$3"
                    paddingVertical="$1"
                    backgroundColor="transparent"
                    onPress={p.onSelect}
                    size="$2"
                    disabled={p.disabled}
                  >
                    <SizableText fontSize="$1" flex={1}>
                      {p.title}
                    </SizableText>
                    {p.accelerator && (
                      <SizableText
                        marginLeft="$2"
                        fontSize="$1"
                        color={'$color9'}
                      >
                        {p.accelerator}
                      </SizableText>
                    )}
                  </ListItem>
                </YGroup.Item>
              ))}
            </YGroup>
          </Popover.Content>
        </Popover>
      ))}
    </XStack>
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
  icon?: ListItemProps['icon']
  accelerator?: string
  disabled?: boolean
}
