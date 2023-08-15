import {TitleBarProps} from '@mintter/app/src/components/titlebar'
import {
  PageActionButtons,
  GroupOptionsButton,
  NavMenu,
  PageContextButtons,
} from './common'
import {Title} from './title'
import {Container, TitlebarWrapper, XStack} from '@mintter/ui'

export default function TitleBarMacos(props: TitleBarProps) {
  if (props.clean) {
    return <TitlebarWrapper data-tauri-drag-region className="window-drag" />
  }

  return (
    <TitlebarWrapper data-tauri-drag-region className="window-drag">
      <XStack
        paddingHorizontal="$2"
        justifyContent="space-between"
        data-tauri-drag-region
        className="window-drag"
      >
        <XStack
          flex={1}
          minWidth={'min-content'}
          flexBasis={0}
          alignItems="center"
          className="window-drag"
          data-tauri-drag-region
        >
          <Container
            paddingLeft={72}
            alignItems="flex-start"
            className="window-drag"
            data-tauri-drag-region
          >
            <XStack data-tauri-drag-region className="no-window-drag">
              <NavMenu />
              <PageContextButtons {...props} />
            </XStack>
          </Container>
        </XStack>
        <XStack flex={1} alignItems="center" data-tauri-drag-region>
          <Title />
        </XStack>
        <XStack
          data-tauri-drag-region
          className="window-drag"
          flex={1}
          justifyContent="flex-end"
          minWidth={'min-content'}
          flexBasis={0}
          alignItems="center"
        >
          <XStack className="no-window-drag">
            <PageActionButtons {...props} />
          </XStack>
        </XStack>
      </XStack>
    </TitlebarWrapper>
  )
}
