import {ActionButtons, NavigationButtons, NavMenu} from './common'
import {Title} from './title'

export function TitleBarMacos() {
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
