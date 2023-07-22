import {TitleBarProps} from '@app/components/titlebar'
import {ActionButtons, NavigationButtons, NavMenu} from './common'
import {Title} from './title'
import {Container, TitlebarWrapper, XStack} from '@mintter/ui'

export default function TitleBarMacos(props: TitleBarProps) {
  if (props.clean) {
    return <TitlebarWrapper data-tauri-drag-region />
  }

  return (
    <TitlebarWrapper data-tauri-drag-region>
      <XStack
        paddingHorizontal="$2"
        justifyContent="space-between"
        data-tauri-drag-region
      >
        <XStack
          flex={1}
          minWidth={'min-content'}
          flexBasis={0}
          alignItems="center"
          data-tauri-drag-region
        >
          <Container
            paddingLeft={72}
            alignItems="flex-start"
            data-tauri-drag-region
          >
            <XStack data-tauri-drag-region>
              <NavMenu />
              <NavigationButtons />
            </XStack>
          </Container>
        </XStack>
        <XStack flex={1} alignItems="center" data-tauri-drag-region>
          <Title />
        </XStack>
        <XStack
          data-tauri-drag-region
          flex={1}
          justifyContent="flex-end"
          minWidth={'min-content'}
          flexBasis={0}
          alignItems="center"
        >
          <ActionButtons {...props} />
        </XStack>
      </XStack>
    </TitlebarWrapper>
  )
}
