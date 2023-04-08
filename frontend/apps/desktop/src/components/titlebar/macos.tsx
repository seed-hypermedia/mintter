import {TitleBarProps} from '@components/titlebar'
import {ActionButtons, NavigationButtons, NavMenu} from './common'
import DiscardDraftButton from './discard-draft-button'
import {Title} from './title'
import {TitlebarRow, TitlebarSection, TitlebarWrapper} from '@mintter/ui'

export default function TitleBarMacos(props: TitleBarProps) {
  if (props.clean) {
    return <TitlebarWrapper />
  }

  return (
    <TitlebarWrapper platform="macos" data-tauri-drag-region>
      <TitlebarRow>
        <TitlebarSection data-tauri-drag-region>
          <NavMenu mainActor={props.mainActor} />
          <NavigationButtons />
          <DiscardDraftButton />
        </TitlebarSection>
        <TitlebarSection flex={1} data-tauri-drag-region>
          <Title />
        </TitlebarSection>

        <TitlebarSection data-tauri-drag-region>
          <ActionButtons {...props} />
        </TitlebarSection>
      </TitlebarRow>
    </TitlebarWrapper>
  )
}
