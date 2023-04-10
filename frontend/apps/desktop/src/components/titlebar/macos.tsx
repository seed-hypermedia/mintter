import {TitleBarProps} from '@components/titlebar'
import {ActionButtons, NavigationButtons, NavMenu} from './common'
import DiscardDraftButton from './discard-draft-button'
import {Title} from './title'
import {Container, TitlebarWrapper, XStack} from '@mintter/ui'

export default function TitleBarMacos(props: TitleBarProps) {
  if (props.clean) {
    return <TitlebarWrapper platform="macos" data-tauri-drag-region />
  }

  return (
    <TitlebarWrapper platform="macos" data-tauri-drag-region>
      <XStack paddingHorizontal="$2" justifyContent="space-between">
        <XStack
          flex={1}
          minWidth={'min-content'}
          flexBasis={0}
          alignItems="center"
        >
          <Container paddingLeft={72} alignItems="flex-start">
            <NavMenu mainActor={props.mainActor} />
          </Container>
          <DiscardDraftButton />
        </XStack>
        <XStack flex={1} alignItems="center">
          <Title />
        </XStack>
        <XStack
          flex={1}
          justifyContent="flex-end"
          minWidth={'min-content'}
          flexBasis={0}
          alignItems="center"
          backgroundColor={'$gray1'}
        >
          <ActionButtons {...props} />
        </XStack>
      </XStack>
    </TitlebarWrapper>
  )
}
