import {ActionButtons, NavigationButtons, NavMenu} from './common'
import {Title} from './title'

interface TitleBarProps {
  settings?: boolean
}

export function TitleBarMacos(props: TitleBarProps) {
  if (props.settings) {
    return (
      <header id="titlebar" className="titlebar-row" data-tauri-drag-region />
    )
  }

  return (
    <header id="titlebar" className="titlebar-row" data-tauri-drag-region>
      <div className="titlebar-section">
        <NavMenu />
        <NavigationButtons />
      </div>

      <Title />

      <ActionButtons />
    </header>
  )
}
