import {Dropdown} from '@mintter/app/src/components/dropdown'
import {useMyAccount} from '@mintter/app/src/models/accounts'
import {useSiteList} from '@mintter/app/src/models/sites'
import {
  NavRoute,
  useNavigate,
  useNavRoute,
} from '@mintter/app/src/utils/navigation'
import {TitleBarProps} from '@mintter/app/src/components/titlebar'
import {
  Draft,
  File,
  Menu,
  Separator,
  SizableText,
  TitlebarRow,
  TitlebarSection,
  TitlebarWrapper,
  User,
  XStack,
} from '@mintter/ui'
import {useEffect, useState} from 'react'
import {MintterIcon} from '../mintter-icon'
import {
  AccountDropdownItem,
  // NavMenu,
  PageActionButtons,
  PageContextButtons,
  SitesNavDropdownItems,
} from './common'
import {Title} from './title'
import {
  CloseButton,
  MaximizeOrRestoreButton,
  MinimizeButton,
} from './window-controls'
import {useIPC} from '@mintter/app/src/app-context'

export default function TitleBarLinux(props: TitleBarProps) {
  const [focus, setFocus] = useState(true)
  const {send} = useIPC()

  useEffect(() => {
    const focus = () => setFocus(true)
    const blur = () => setFocus(false)

    window.addEventListener('focus', focus)
    window.addEventListener('blur', blur)

    return () => {
      window.removeEventListener('focus', focus)
      window.removeEventListener('blur', blur)
    }
  }, [])

  // in the clean window we render a stripped down version of the titlebar
  if (props.clean) {
    return (
      <TitlebarWrapper>
        <TitlebarRow>
          <TitlebarSection>
            <span>
              <MintterIcon />
            </span>
          </TitlebarSection>
          <TitlebarSection flex={1} alignItems="flex-end">
            <XStack className="no-window-drag" marginLeft="auto">
              <CloseButton />
            </XStack>
          </TitlebarSection>
        </TitlebarRow>
      </TitlebarWrapper>
    )
  }

  return (
    <TitlebarWrapper data-has-focus={focus} className="window-drag">
      <TitlebarRow>
        <TitlebarSection>
          <MintterIcon />
          <XStack className="no-window-drag">
            <NavMenu />
            <PageContextButtons {...props} />
          </XStack>
        </TitlebarSection>
        <TitlebarSection flex={1}>
          <Title />
        </TitlebarSection>
        <TitlebarSection>
          <XStack className="no-window-drag">
            <PageActionButtons {...props} />
          </XStack>
          <XStack className="no-window-drag">
            <MinimizeButton />
            <MaximizeOrRestoreButton />
            <CloseButton />
          </XStack>
        </TitlebarSection>
      </TitlebarRow>
    </TitlebarWrapper>
  )
}

function NavMenu() {
  const route = useNavRoute()
  const navigate = useNavigate()
  const sites = useSiteList()
  const {send, invoke} = useIPC()
  const myAccount = useMyAccount()
  const editingEnabled = route.key == 'draft'
  const spawn = useNavigate('spawn')
  const onRoute = (route: NavRoute) => {
    if (route.key === 'settings') spawn(route)
    else navigate(route)
  }

  return (
    <Dropdown.Root>
      <Dropdown.Trigger
        chromeless
        outlineColor="transparent"
        outlineStyle="none"
        icon={Menu}
      />
      <Dropdown.Portal>
        <Dropdown.Content side="bottom" align="start">
          <AccountDropdownItem account={myAccount.data} onRoute={onRoute} />
          <Separator />
          <Dropdown.Item
            disabled={route.key == 'home'}
            data-testid="menu-item-inbox"
            onPress={() => navigate({key: 'home'})}
            icon={File}
            title="All Publications"
            iconAfter={
              <SizableText size="$1" color="$mint5">
                Ctrl+1
              </SizableText>
            }
          />
          <Dropdown.Item
            disabled={route.key == 'drafts'}
            data-testid="menu-item-drafts"
            onPress={() => {
              navigate({key: 'drafts'})
            }}
            icon={Draft}
            title="Drafts"
            iconAfter={
              <SizableText size="$1" color="$mint5">
                Ctrl+8
              </SizableText>
            }
          />
          <Dropdown.Item
            disabled={route.key == 'contacts'}
            onPress={() => navigate({key: 'contacts'})}
            icon={User}
            title="Connections"
            iconAfter={
              <SizableText size="$1" color="$mint5">
                Ctrl+9
              </SizableText>
            }
          />
          <SitesNavDropdownItems sites={sites.data} onRoute={onRoute} />
          <Separator />
          <Dropdown.Item
            onPress={() => send('open_quick_switcher')}
            title="Quick Switcher"
            iconAfter={
              <SizableText size="$1" color="$mint5">
                Ctrl+K
              </SizableText>
            }
          />

          <Dropdown.Item
            title="New Window"
            iconAfter={
              <SizableText size="$1" color="$mint5">
                Ctrl+N
              </SizableText>
            }
            onPress={() => spawn({key: 'home'})}
          />

          <MenuItem
            title="Reload"
            accelerator="Ctrl+R"
            onPress={() => window.location.reload()}
          />

          <Separator />

          {/* <Dropdown.Item
            title="Find..."
            iconAfter={
              <SizableText size="$1" color="$mint5">
                Ctrl+F
              </SizableText>
            }
            onPress={() => send('open_find')}
          /> */}

          <Dropdown.Sub>
            <Dropdown.SubTrigger disabled={!editingEnabled}>
              Format
            </Dropdown.SubTrigger>
            <Dropdown.SubContent>
              <MenuItem
                title="Strong"
                accelerator="Ctrl+B"
                onPress={() => send('format_mark', 'strong')}
                disabled={!editingEnabled}
              />
              <MenuItem
                title="Emphasis"
                accelerator="Ctrl+I"
                onPress={() => send('format_mark', 'emphasis')}
                disabled={!editingEnabled}
              />
              <MenuItem
                title="Code"
                accelerator="Ctrl+E"
                onPress={() => send('format_mark', 'code')}
                disabled={!editingEnabled}
              />
              <MenuItem
                title="Underline"
                accelerator="Ctrl+U"
                onPress={() => send('format_mark', 'underline')}
                disabled={!editingEnabled}
              />
              <MenuItem
                title="Strikethrough"
                onPress={() => send('format_mark', 'strikethrough')}
                disabled={!editingEnabled}
              />
              <MenuItem
                title="Subscript"
                onPress={() => send('format_mark', 'subscript')}
                disabled={!editingEnabled}
              />
              <MenuItem
                title="Superscript"
                onPress={() => send('format_mark', 'superscript')}
                disabled={!editingEnabled}
              />

              <Separator />

              <MenuItem
                title="Heading"
                accelerator="Ctrl+Shift+H"
                onPress={() => send('format_block', 'heading')}
                disabled={!editingEnabled}
              />
              <MenuItem
                title="Statement"
                accelerator="Ctrl+Shif+S"
                onPress={() => send('format_block', 'statement')}
                disabled={!editingEnabled}
              />
              <MenuItem
                title="Blockquote"
                accelerator="Ctrl+Shift+Q"
                onPress={() => send('format_block', 'blockquote')}
                disabled={!editingEnabled}
              />
              <MenuItem
                title="Code Block"
                accelerator="Ctrl+Shift+E"
                onPress={() => send('format_block', 'codeblock')}
                disabled={!editingEnabled}
              />

              <Separator />

              <MenuItem
                title="Bullet List"
                accelerator="Ctrl+Shift+7"
                onPress={() => send('format_list', 'unordered_list')}
                disabled={!editingEnabled}
              />
              <MenuItem
                title="Numbered List"
                accelerator="Ctrl+Shift+8"
                onPress={() => send('format_list', 'ordered_list')}
                disabled={!editingEnabled}
              />
              <MenuItem
                title="Plain List"
                accelerator="Ctrl+Shift+9"
                onPress={() => send('format_list', 'group')}
                disabled={!editingEnabled}
              />
            </Dropdown.SubContent>
          </Dropdown.Sub>

          <Separator />

          <MenuItem
            title="Settings"
            accelerator="Ctrl+,"
            onPress={() => spawn({key: 'settings'})}
          />

          <MenuItem
            title="Documentation"
            onPress={() => invoke('open_documentation')}
          />
          <MenuItem
            title="Release Notes"
            onPress={() => invoke('open_release_notes')}
          />
          <MenuItem
            title="Acknowledgements"
            onPress={() => invoke('open_acknowledgements')}
          />
          <MenuItem
            title="About Mintter"
            onPress={() => invoke('open_about')}
          />
        </Dropdown.Content>
      </Dropdown.Portal>
    </Dropdown.Root>
  )
}

export interface MenuItemProps {
  title: string
  accelerator?: string
  disabled?: boolean
  onPress: () => void
  icon?: any
}

function MenuItem({accelerator, ...props}: MenuItemProps) {
  useEffect(() => {
    if (accelerator) {
      const keys = accelerator.split('+')

      window.addEventListener('keyup', (e) => {
        if (
          keys.every((k) => {
            if (k == 'Alt') return e.altKey
            if (k == 'Shift') return e.shiftKey
            if (k == 'Ctrl') return e.ctrlKey
            k == e.key
          })
        ) {
          console.log(`triggered acc ${accelerator}!`)
        }
      })
    }
  }, [accelerator])

  return (
    <Dropdown.Item
      iconAfter={
        accelerator ? (
          <SizableText size="$1" color="$mint5">
            {accelerator}
          </SizableText>
        ) : undefined
      }
      {...props}
    />
  )
}
