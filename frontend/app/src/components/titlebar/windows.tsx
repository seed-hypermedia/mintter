/* eslint-disable @typescript-eslint/no-empty-function */
import {TitleBarProps} from '@components/titlebar'
import * as NavigationMenu from '@radix-ui/react-navigation-menu'
import {emit as tauriEmit} from '@tauri-apps/api/event'
import {invoke} from '@tauri-apps/api/tauri'
import {getCurrent} from '@tauri-apps/api/window'
import {useEffect} from 'react'
import {useLocation} from 'wouter'
import '../../styles/dropdown.scss'
import {ActionButtons, NavigationButtons, NavMenu} from './common'
import {MintterIcon} from './mintter-icon'
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
      <header id="titlebar" data-testid="titlebar" data-tauri-drag-region>
        <div className="titlebar-row" data-tauri-drag-region>
          <MintterIcon />

          <CloseButton />
        </div>
      </header>
    )
  }

  return (
    <header id="titlebar" data-testid="titlebar" data-tauri-drag-region>
      <div className="titlebar-row" data-tauri-drag-region>
        <MintterIcon />

        <SystemMenu />

        <Title />

        <div id="titlebar-window-controls">
          <MinimizeButton />
          <MaximizeOrRestoreButton />
          <CloseButton />
        </div>
      </div>

      <div
        className="titlebar-row"
        style={{blockSize: 'var(--topbar-h)'}}
        data-tauri-drag-region
      >
        <div className="titlebar-section">
          <NavigationButtons />
          <NavMenu mainActor={props.mainActor} />
        </div>

        <div data-tauri-drag-region style={{flexGrow: 1}}></div>

        <ActionButtons {...props} />
      </div>
    </header>
  )
}

function SystemMenu() {
  const [location, setLocation] = useLocation()

  const editingDisabled = !location.startsWith('/d/')

  return (
    <NavigationMenu.Root id="titlebar-system-menu">
      <NavigationMenu.List className="system-menu">
        <NavigationMenu.Item>
          <NavigationMenu.Trigger className="titlebar-button">
            Mintter
          </NavigationMenu.Trigger>
          <NavigationMenu.Content className="content">
            <NavigationMenu.Sub className="dropdown">
              <NavigationMenu.List className="content">
                <MenuItem
                  title="About Mintter"
                  onSelect={() => invoke('open_about')}
                />
                <div className="separator"></div>
                <MenuItem
                  title="Preferences..."
                  accelerator="Ctrl+,"
                  onSelect={() => invoke('open_preferences')}
                />
                <div className="separator"></div>
                <MenuItem
                  title="Hide"
                  accelerator="Ctrl+H"
                  onSelect={() => getCurrent().hide()}
                />
                <div className="separator"></div>
                <MenuItem title="Quit" onSelect={() => process.exit(0)} />
              </NavigationMenu.List>
            </NavigationMenu.Sub>
          </NavigationMenu.Content>
        </NavigationMenu.Item>
        <NavigationMenu.Item>
          <NavigationMenu.Trigger className="titlebar-button">
            File
          </NavigationMenu.Trigger>
          <NavigationMenu.Content>
            <NavigationMenu.Sub className="dropdown">
              <NavigationMenu.List className="content">
                <MenuItem
                  title="New Window"
                  accelerator="Ctrl+N"
                  onSelect={() => invoke('new_window')}
                />
                <div className="separator"></div>
                <MenuItem
                  title="Close"
                  accelerator="Ctrl+F4"
                  onSelect={() => getCurrent().close()}
                />
                <MenuItem
                  title="Close All Windows"
                  accelerator="Ctrl+Shift+Alt+W"
                  onSelect={() => invoke('close_all_windows')}
                />
              </NavigationMenu.List>
            </NavigationMenu.Sub>
          </NavigationMenu.Content>
        </NavigationMenu.Item>
        <NavigationMenu.Item>
          <NavigationMenu.Trigger className="titlebar-button">
            Edit
          </NavigationMenu.Trigger>
          <NavigationMenu.Content>
            <NavigationMenu.Sub className="dropdown">
              <NavigationMenu.List className="content">
                <MenuItem
                  title="Undo"
                  accelerator="Ctrl+Z"
                  onSelect={() => {}}
                  disabled={editingDisabled}
                />
                <MenuItem
                  title="Redo"
                  accelerator="Ctrl+Shift+Z"
                  onSelect={() => {}}
                  disabled={editingDisabled}
                />
                <div className="separator"></div>
                <MenuItem
                  title="Cut"
                  accelerator="Ctrl+X"
                  onSelect={() => {}}
                  disabled={editingDisabled}
                />
                <MenuItem
                  title="Copy"
                  accelerator="Ctrl+C"
                  onSelect={() => {}}
                />
                <MenuItem
                  title="Paste"
                  accelerator="Ctrl+V"
                  onSelect={() => {}}
                  disabled={editingDisabled}
                />
                <MenuItem
                  title="Select All"
                  accelerator="Ctrl+A"
                  onSelect={() => tauriEmit('select_all')}
                />
                <MenuItem
                  title="Find..."
                  accelerator="Ctrl+F"
                  onSelect={() => tauriEmit('open_find')}
                />
              </NavigationMenu.List>
            </NavigationMenu.Sub>
          </NavigationMenu.Content>
        </NavigationMenu.Item>
        <NavigationMenu.Item>
          <NavigationMenu.Trigger className="titlebar-button">
            Format
          </NavigationMenu.Trigger>
          <NavigationMenu.Content>
            <NavigationMenu.Sub className="dropdown">
              <NavigationMenu.List className="content">
                <MenuItem
                  title="Strong"
                  accelerator="Ctrl+B"
                  onSelect={() => tauriEmit('format_mark', 'strong')}
                  disabled={editingDisabled}
                />
                <MenuItem
                  title="Emphasis"
                  accelerator="Ctrl+I"
                  onSelect={() => tauriEmit('format_mark', 'emphasis')}
                  disabled={editingDisabled}
                />
                <MenuItem
                  title="Code"
                  accelerator="Ctrl+E"
                  onSelect={() => tauriEmit('format_mark', 'code')}
                  disabled={editingDisabled}
                />
                <MenuItem
                  title="Underline"
                  accelerator="Ctrl+U"
                  onSelect={() => tauriEmit('format_mark', 'underline')}
                  disabled={editingDisabled}
                />
                <MenuItem
                  title="Strikethrough"
                  onSelect={() => tauriEmit('format_mark', 'strikethrough')}
                  disabled={editingDisabled}
                />
                <MenuItem
                  title="Subscript"
                  onSelect={() => tauriEmit('format_mark', 'subscript')}
                  disabled={editingDisabled}
                />
                <MenuItem
                  title="Superscript"
                  onSelect={() => tauriEmit('format_mark', 'superscript')}
                  disabled={editingDisabled}
                />

                <div className="separator"></div>

                <MenuItem
                  title="Heading"
                  accelerator="Ctrl+Shift+H"
                  onSelect={() => tauriEmit('format_block', 'heading')}
                  disabled={editingDisabled}
                />
                <MenuItem
                  title="Statement"
                  accelerator="Ctrl+Shif+S"
                  onSelect={() => tauriEmit('format_block', 'statement')}
                  disabled={editingDisabled}
                />
                <MenuItem
                  title="Blockquote"
                  accelerator="Ctrl+Shift+Q"
                  onSelect={() => tauriEmit('format_block', 'blockquote')}
                  disabled={editingDisabled}
                />
                <MenuItem
                  title="Code Block"
                  accelerator="Ctrl+Shift+E"
                  onSelect={() => tauriEmit('format_block', 'codeblock')}
                  disabled={editingDisabled}
                />

                <div className="separator"></div>

                <MenuItem
                  title="Bullet List"
                  accelerator="Ctrl+Shift+7"
                  onSelect={() => tauriEmit('format_list', 'unordered_list')}
                  disabled={editingDisabled}
                />
                <MenuItem
                  title="Numbered List"
                  accelerator="Ctrl+Shift+8"
                  onSelect={() => tauriEmit('format_list', 'ordered_list')}
                  disabled={editingDisabled}
                />
                <MenuItem
                  title="Plain List"
                  accelerator="Ctrl+Shift+9"
                  onSelect={() => tauriEmit('format_list', 'group')}
                  disabled={editingDisabled}
                />
              </NavigationMenu.List>
            </NavigationMenu.Sub>
          </NavigationMenu.Content>
        </NavigationMenu.Item>
        <NavigationMenu.Item>
          <NavigationMenu.Trigger className="titlebar-button">
            View
          </NavigationMenu.Trigger>
          <NavigationMenu.Content className="content">
            <NavigationMenu.Sub className="dropdown">
              <NavigationMenu.List className="content">
                <MenuItem
                  title="Reload"
                  accelerator="Ctrl+R"
                  onSelect={() => window.location.reload()}
                />
                <MenuItem
                  title="Quick Switcher..."
                  accelerator="Ctrl+K"
                  onSelect={() => tauriEmit('open_quick_switcher')}
                />
                <MenuItem
                  title="Connections"
                  accelerator="Ctrl+9"
                  onSelect={() => setLocation('/connections')}
                />
              </NavigationMenu.List>
            </NavigationMenu.Sub>
          </NavigationMenu.Content>
        </NavigationMenu.Item>
        <NavigationMenu.Item>
          <NavigationMenu.Trigger className="titlebar-button">
            Help
          </NavigationMenu.Trigger>
          <NavigationMenu.Content className="content">
            <NavigationMenu.Sub className="dropdown">
              <NavigationMenu.List className="content">
                <MenuItem
                  title="Documentation"
                  onSelect={() => invoke('open_documentation')}
                />
                <MenuItem
                  title="Release Notes"
                  onSelect={() => invoke('open_release_notes')}
                />
                <MenuItem
                  title="Acknowledgements"
                  onSelect={() => invoke('open_acknowledgements')}
                />
              </NavigationMenu.List>
            </NavigationMenu.Sub>
          </NavigationMenu.Content>
        </NavigationMenu.Item>
      </NavigationMenu.List>
    </NavigationMenu.Root>
  )
}

export interface MenuItemProps {
  title: string
  accelerator?: string
  disabled?: boolean
  onSelect: () => void
}

function MenuItem(props: MenuItemProps) {
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
    <NavigationMenu.Item
      className="item"
      onClick={props.onSelect}
      data-disabled={props.disabled}
    >
      {props.title}
      {props.accelerator && (
        <div className="right-slot">{props.accelerator}</div>
      )}
    </NavigationMenu.Item>
  )
}
