import {TitleBarProps} from '@components/titlebar'
import {ActionButtons, NavigationButtons, NavMenu} from './common'
import {Title} from './title'

export default function TitleBarMacos(props: TitleBarProps) {
  if (props.clean) {
    return (
      <header
        data-testid="titlebar"
        id="titlebar"
        className="titlebar-row"
        data-tauri-drag-region
      />
    )
  }

  return (
    <header
      id="titlebar"
      data-testid="titlebar"
      className="titlebar-row"
      data-tauri-drag-region
    >
      <div className="titlebar-section">
        <NavMenu mainActor={props.mainActor} />
        <NavigationButtons />
      </div>

      <Title />

      <ActionButtons {...props} />
    </header>
  )
}
