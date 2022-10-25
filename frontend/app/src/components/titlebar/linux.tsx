import {Dropdown} from '@app/editor/dropdown'
import {Icon} from '@components/icon'
import {emit as tauriEmit} from '@tauri-apps/api/event'
import {invoke} from '@tauri-apps/api/tauri'
import {useEffect, useState} from 'react'
import {useLocation} from 'wouter'
import {ActionButtons, NavigationButtons} from './common'
import {Title} from './title'
import {
  CloseButton,
  MaximizeOrRestoreButton,
  MinimizeButton,
} from './window-controls'

export function TitleBarLinux() {
  const [focus, setFocus] = useState(true)

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

  return (
    <header
      id="titlebar"
      className="titlebar-row"
      data-has-focus={focus}
      data-tauri-drag-region
    >
      <div className="titlebar-section">
        <NavigationButtons />
      </div>

      <Title />

      <ActionButtons />
      <div className="titlebar-section" style={{paddingLeft: 0}}>
        <Menu />
      </div>

      <div id="titlebar-window-controls">
        <MinimizeButton />
        <MaximizeOrRestoreButton />
        <CloseButton />
      </div>
    </header>
  )
}

function Menu() {
  const [location, setLocation] = useLocation()

  const editingEnabled = location.startsWith('/d/')

  return (
    <Dropdown.Root>
      <Dropdown.Trigger asChild>
        <button
          data-testid="titlebar-menu"
          id="titlebar-menu"
          className="titlebar-button"
        >
          <Icon name="HamburgerMenu" size="2" color="muted" />
        </button>
      </Dropdown.Trigger>
      <Dropdown.Portal>
        <Dropdown.Content>
          <Dropdown.Item
            disabled={location == '/inbox'}
            data-testid="menu-item-inbox"
            onSelect={() => setLocation('/inbox')}
          >
            <Icon name="File" />
            <span>Inbox</span>
          </Dropdown.Item>
          <Dropdown.Item
            disabled={location == '/drafts'}
            data-testid="menu-item-drafts"
            onSelect={() => setLocation('/drafts')}
          >
            <Icon name="PencilAdd" />
            <span>Drafts</span>
          </Dropdown.Item>

          <Dropdown.Item onSelect={() => tauriEmit('open_quick_switcher')}>
            Quick Switcher
            <Dropdown.RightSlot>Ctrl+K</Dropdown.RightSlot>
          </Dropdown.Item>

          <Dropdown.Separator />

          <MenuItem
            title="New Window"
            accelerator="Ctrl+N"
            onSelect={() => invoke('new_invoke')}
          />

          <Dropdown.Separator />

          <MenuItem
            title="Find..."
            accelerator="Ctrl+F"
            onSelect={() => tauriEmit('open_find')}
          />

          <Dropdown.Sub>
            <Dropdown.SubTrigger>Format</Dropdown.SubTrigger>
            <Dropdown.SubContent>
              <MenuItem
                title="Strong"
                accelerator="Ctrl+B"
                onSelect={() => tauriEmit('format_mark', 'strong')}
                disabled={!editingEnabled}
              />
              <MenuItem
                title="Emphasis"
                accelerator="Ctrl+I"
                onSelect={() => tauriEmit('format_mark', 'emphasis')}
                disabled={!editingEnabled}
              />
              <MenuItem
                title="Code"
                accelerator="Ctrl+E"
                onSelect={() => tauriEmit('format_mark', 'code')}
                disabled={!editingEnabled}
              />
              <MenuItem
                title="Underline"
                accelerator="Ctrl+U"
                onSelect={() => tauriEmit('format_mark', 'underline')}
                disabled={!editingEnabled}
              />
              <MenuItem
                title="Strikethrough"
                onSelect={() => tauriEmit('format_mark', 'strikethrough')}
                disabled={!editingEnabled}
              />
              <MenuItem
                title="Subscript"
                onSelect={() => tauriEmit('format_mark', 'subscript')}
                disabled={!editingEnabled}
              />
              <MenuItem
                title="Superscript"
                onSelect={() => tauriEmit('format_mark', 'superscript')}
                disabled={!editingEnabled}
              />

              <Dropdown.Separator />

              <MenuItem
                title="Heading"
                accelerator="Ctrl+Shift+H"
                onSelect={() => tauriEmit('format_block', 'heading')}
                disabled={!editingEnabled}
              />
              <MenuItem
                title="Statement"
                accelerator="Ctrl+Shif+S"
                onSelect={() => tauriEmit('format_block', 'statement')}
                disabled={!editingEnabled}
              />
              <MenuItem
                title="Blockquote"
                accelerator="Ctrl+Shift+Q"
                onSelect={() => tauriEmit('format_block', 'blockquote')}
                disabled={!editingEnabled}
              />
              <MenuItem
                title="Code Block"
                accelerator="Ctrl+Shift+E"
                onSelect={() => tauriEmit('format_block', 'codeblock')}
                disabled={!editingEnabled}
              />

              <Dropdown.Separator />

              <MenuItem
                title="Bullet List"
                accelerator="Ctrl+Shift+7"
                onSelect={() => tauriEmit('format_list', 'unordered_list')}
                disabled={!editingEnabled}
              />
              <MenuItem
                title="Numbered List"
                accelerator="Ctrl+Shift+8"
                onSelect={() => tauriEmit('format_list', 'ordered_list')}
                disabled={!editingEnabled}
              />
              <MenuItem
                title="Plain List"
                accelerator="Ctrl+Shift+9"
                onSelect={() => tauriEmit('format_list', 'group')}
                disabled={!editingEnabled}
              />
            </Dropdown.SubContent>
          </Dropdown.Sub>

          <Dropdown.Sub>
            <Dropdown.SubTrigger>View</Dropdown.SubTrigger>
            <Dropdown.SubContent>
              <MenuItem
                title="Reload"
                accelerator="Ctrl+R"
                onSelect={() => window.location.reload()}
              />
            </Dropdown.SubContent>
          </Dropdown.Sub>

          <Dropdown.Separator />

          <MenuItem
            title="Preferences"
            accelerator="Ctrl+,"
            onSelect={() => invoke('open_preferences')}
          />

          <Dropdown.Separator />

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
          <MenuItem
            title="About Mintter"
            onSelect={() => invoke('open_about')}
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
    <Dropdown.Item onSelect={props.onSelect} disabled={props.disabled}>
      {props.title}
      {props.accelerator && (
        <Dropdown.RightSlot>{props.accelerator}</Dropdown.RightSlot>
      )}
    </Dropdown.Item>
  )
}
