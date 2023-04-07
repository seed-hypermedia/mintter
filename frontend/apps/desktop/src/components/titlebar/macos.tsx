import {TitleBarProps} from '@components/titlebar'
import {ActionButtons, NavigationButtons, NavMenu} from './common'
import DiscardDraftButton from './discard-draft-button'
import {Title} from './title'
import {Titlebar, TitlebarRow, TitlebarSection} from './titlebar'

export default function TitleBarMacos(props: TitleBarProps) {
  if (props.clean) {
    return <Titlebar />
  }

  return (
    <Titlebar>
      <TitlebarRow>
        <TitlebarSection>
          <NavMenu mainActor={props.mainActor} />
          <NavigationButtons />
        </TitlebarSection>
        <TitlebarSection>
          <DiscardDraftButton />
        </TitlebarSection>

        <Title />

        <ActionButtons {...props} />
      </TitlebarRow>
    </Titlebar>
  )
}
