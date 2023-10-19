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
import * as NavigationMenu from '@radix-ui/react-navigation-menu'
import {useEffect, useMemo} from 'react'
import {MintterIcon} from '../mintter-icon'
import {NavMenu, PageActionButtons, PageContextButtons} from './common'
import {Title} from './title'
import {
  CloseButton,
  MaximizeOrRestoreButton,
  MinimizeButton,
} from './window-controls'
import './windows.css'

export default function TitleBarWindows(props: TitleBarProps) {
  // in the settings window we render a stripped down version of the titlebar
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
        >
          <XStack
            flex={1}
            alignItems="flex-start"
            paddingHorizontal={0}
            padding="$2"
          >
            <XStack className="no-window-drag">
              <NavMenu />
              <PageContextButtons {...props} />
            </XStack>
          </XStack>
        </XStack>
        <TitlebarSection
          position="absolute"
          alignItems="center"
          justifyContent="center"
          zIndex="$0"
          width="100%"
          pointerEvents="none"
          height="100%"
          ai="center"
          jc="center"
        >
          <Title />
        </TitlebarSection>
        <XStack flex={1} />
        <XStack
          className="no-window-drag"
          flex={1}
          justifyContent="flex-end"
          minWidth={'min-content'}
          flexBasis={0}
          alignItems="center"
        >
          <PageActionButtons {...props} />
        </XStack>
      </TitlebarRow>
    </TitlebarWrapper>
  )
}

function SystemMenu() {
  const {hide, close} = useWindowUtils()
  const spawn = useNavigate('spawn')
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
            title: 'Close all Window',
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
            onSelect: () => send('open_quick_switcher'),
            icon: Search,
          },
          {
            id: 'contacts',
            title: 'Contacts',
            accelerator: 'Ctrl+9',
            onSelect: () => {},
            icon: Reload,
          },
        ],
      },
    ],
    [close, hide, invoke, send, spawn],
  )

  return (
    // <NavigationMenu.Root asChild className="no-window-drag">
    //   <XStack
    //     position="relative"
    //     justifyContent="flex-start"
    //     width="100%"
    //     zIndex="$1"
    //     bg="red"
    //   >
    //     <NavigationMenu.List asChild>
    //       <XStack
    //         bg="green"
    //         className="no-window-drag"
    //         display="flex"
    //         style={{listStyle: 'none'}}
    //       >
    //         {menuItems.map((item) => (
    //           <NavigationMenu.Item key={item.id} style={{position: 'relative'}}>
    //             <NavigationMenu.Trigger asChild>
    //               <Button size="$1">{item.title}</Button>
    //             </NavigationMenu.Trigger>
    //             {item.children.length ? (
    //               <NavigationMenu.Content className="NavigationMenuContent">
    //                 <YStack>
    //                   {item.children.map((p) => (
    //                     // <MenuItem
    //                     //   disabled={p.disabled}
    //                     //   key={p.id}
    //                     //   {...p}
    //                     //   onSelect={p.onSelect}
    //                     // />
    //                     <li key={p.id}>{p.title}</li>
    //                   ))}
    //                 </YStack>
    //               </NavigationMenu.Content>
    //             ) : null}
    //           </NavigationMenu.Item>
    //         ))}
    //       </XStack>
    //     </NavigationMenu.List>
    //     <XStack>
    //       <NavigationMenu.Viewport className="NavigationMenuViewport" />
    //     </XStack>
    //   </XStack>
    // </NavigationMenu.Root>
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
                  <MenuItem
                    disabled={p.disabled}
                    key={p.id}
                    {...p}
                    onSelect={p.onSelect}
                  />
                </YGroup.Item>
              ))}
            </YGroup>
          </Popover.Content>
        </Popover>
      ))}
    </XStack>
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
            props.onSelect()
          }}
        >
          <SizableText fontSize="$2" flex={1}>
            {props.title}
          </SizableText>
          {props.accelerator && (
            <SizableText fontSize="$2" opacity={0.5}>
              {props.accelerator}
            </SizableText>
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
