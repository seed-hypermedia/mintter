import {useIPC, useWindowUtils} from '@mintter/app/app-context'
import {TitleBarProps} from '@mintter/app/components/titlebar'
import {useNavigate} from '@mintter/app/utils/useNavigate'
import {
  AddSquare,
  Button,
  Close,
  CloseAll,
  Delete,
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
} from '@mintter/ui'
import {useMemo} from 'react'
import {useTriggerWindowEvent} from '../utils/window-events'
import {
  NavMenu,
  NavigationButtons,
  PageActionButtons,
  PageContextControl,
} from './titlebar-common'
import {Title} from './titlebar-title'
import './titlebar-windows-linux.css'
import {
  CloseButton,
  MaximizeOrRestoreButton,
  MinimizeButton,
} from './window-controls'

export default function TitleBarWindows(props: TitleBarProps) {
  if (props.clean) {
    return (
      <TitlebarWrapper style={{flex: 'none'}} className="window-drag">
        <TitlebarRow>
          <TitlebarSection
            flex={1}
            alignItems="center"
            justifyContent="flex-end"
          >
            <XStack className="no-window-drag">
              <CloseButton />
            </XStack>
          </TitlebarSection>
        </TitlebarRow>
      </TitlebarWrapper>
    )
  }

  return (
    <WindowsLinuxTitleBar
      right={<PageActionButtons {...props} />}
      left={
        <XStack paddingHorizontal={0} paddingVertical="$2" space="$2">
          <NavMenu />
          <NavigationButtons />
          <PageContextControl {...props} />
        </XStack>
      }
      title={<Title />}
    />
  )
}

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
          <XStack className="no-window-drag">
            <MinimizeButton />
            <MaximizeOrRestoreButton />
            <CloseButton />
          </XStack>
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
  const {hide, close} = useWindowUtils()
  const spawn = useNavigate('spawn')
  const triggerFocusedWindow = useTriggerWindowEvent()
  const {invoke, send} = useIPC()
  const menuItems: Array<MenuItemElement> = useMemo(
    () => [
      {
        id: 'mintter',
        title: 'Mintter',
        children: [
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
            onSelect: () => hide(),
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
            onSelect: () => triggerFocusedWindow('openQuickSwitcher'),
            icon: Search,
          },
          // { // todo, fix this
          //   id: 'contacts',
          //   title: 'Contacts',
          //   accelerator: 'Ctrl+9',
          //   onSelect: () => {},
          //   icon: Reload,
          // },
        ],
      },
    ],
    [close, hide, invoke, spawn, triggerFocusedWindow],
  )

  return (
    <XStack className="no-window-drag">
      {menuItems.map((item) => (
        <Popover key={item.id} placement="bottom-start">
          <Popover.Trigger asChild>
            <Button
              size="$1.5"
              backgroundColor="transparent"
              borderRadius={0}
              paddingHorizontal="$2"
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
              'quick',
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
                    }}
                    paddingHorizontal="$3"
                    paddingVertical="$1"
                    backgroundColor="transparent"
                    onPress={p.onSelect}
                  >
                    <SizableText fontSize="$2" flex={1}>
                      {p.title}
                    </SizableText>
                    {p.accelerator && (
                      <SizableText
                        marginLeft="$2"
                        fontSize="$2"
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
  icon: ListItemProps['icon']
  accelerator?: string
  disabled?: boolean
}
