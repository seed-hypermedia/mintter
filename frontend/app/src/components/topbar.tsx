import {useAccount} from '@app/hooks'
import {useMainPage} from '@app/main-page-context'
import {css, styled} from '@app/stitches.config'
import {getDocumentTitle} from '@app/utils/get-document-title'
import {Text} from '@components/text'
import {useActor} from '@xstate/react'
import {Box} from './box'
import {Icon} from './icon'

const draggableProps = {
  'data-tauri-drag-region': true,
}

export const TopbarStyled = styled(Box, {
  gridArea: 'topbar',
  width: '$full',
  height: 40,
  display: 'flex',
  borderBottom: '1px solid $colors$base-border-subtle',
  background: '$base-background-subtle',
  alignItems: 'center',
  justifyContent: 'flex-start',
  paddingHorizontal: '$5',
  gap: '$4',
})

let TopbarButton = styled('button', {
  all: 'unset',
  padding: 0,
  width: '$8',
  height: '$8',
  borderRadius: '$2',
  backgroundColor: 'transparent',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  '&:hover': {
    cursor: 'pointer',
    backgroundColor: '$base-component-bg-hover',
  },
})

export const topbarSection = css({
  height: '$full',
  display: 'flex',
  alignItems: 'center',
})

type TopbarProps = {
  back?: () => void
  forward?: () => void
}

export function Topbar({
  back = () => window.history.back(),
  forward = () => window.history.forward(),
}: TopbarProps) {
  let mainPage = useMainPage()
  let [mainState] = useActor(mainPage)
  let {data, isSuccess} = useAccount(mainState.context.document?.author)

  function toggleLibrary() {
    mainState.context.library.send('LIBRARY.TOGGLE')
  }

  let title = getDocumentTitle(mainState.context.document)

  return (
    <TopbarStyled data-tauri-drag-region>
      <span style={{display: 'block', flex: 'none', width: 60}} />
      <Box css={{display: 'flex'}} {...draggableProps}>
        <TopbarButton
          color="muted"
          data-testid="history-back"
          onClick={(e) => {
            e.preventDefault()
            mainPage.send('goBack')
          }}
        >
          <Icon name="ArrowChevronLeft" color="muted" size="2" />
        </TopbarButton>
        <TopbarButton
          color="muted"
          data-testid="history-forward"
          onClick={(e) => {
            e.preventDefault()
            mainPage.send('goForward')
          }}
        >
          <Icon name="ArrowChevronRight" color="muted" size="2" />
        </TopbarButton>
      </Box>

      <Box
        css={{flex: 1, display: 'flex', alignItems: 'baseline', gap: '$2'}}
        data-tauri-drag-region
      >
        {mainState.matches('routes.editor.valid') ||
        mainState.matches('routes.publication.valid') ? (
          <>
            <Text
              size="3"
              fontWeight="medium"
              aria-label="Document Title"
              data-testid="topbar-title"
              data-tauri-drag-region
            >
              {title}
            </Text>
            <Text size="1" color="muted">
              by
            </Text>
            {data && isSuccess ? (
              <Text
                size="1"
                color="muted"
                css={{textDecoration: 'underline'}}
                data-testid="topbar-author"
              >
                {data.profile?.alias}
              </Text>
            ) : (
              <Text size="1" color="muted" css={{textDecoration: 'underline'}}>
                ...
              </Text>
            )}
          </>
        ) : null}
      </Box>
      {/* <Box>other actions</Box> */}
      <TopbarButton onClick={toggleLibrary} data-tauri-drag-region>
        <Box
          css={{
            display: 'flex',
            alignItems: 'center',
            gap: '$2',
            height: '$full',
          }}
        >
          <Text size="2">Local Node</Text>
          <Icon name="Sidenav" size="2" />
        </Box>
      </TopbarButton>
    </TopbarStyled>
  )
}
