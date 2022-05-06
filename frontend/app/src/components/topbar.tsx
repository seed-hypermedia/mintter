import {getTitleFromContent} from '@app/editor/use-editor-draft'
import {useAccount} from '@app/hooks'
import {useMainPage} from '@app/main-page-context'
import {css, styled} from '@app/stitches.config'
import {Text} from '@components/text'
import {invoke} from '@tauri-apps/api'
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
  borderBottom: '1px solid $colors$menu-shadow',
  background: '$background-alt',
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
    backgroundColor: '$hover',
  },
})

export const topbarSection = css({
  height: '$full',
  display: 'flex',
  alignItems: 'center',
})

type TopbarProps = {
  back?: () => void
  forward: () => void
}

export function Topbar({
  back = window.history.back,
  forward = window.history.forward,
}: TopbarProps) {
  let mainPage = useMainPage()
  let [mainState] = useActor(mainPage)
  let {data, isSuccess} = useAccount(mainState.context.document?.author)

  async function onCreateDraft() {
    await invoke('open_in_new_window', {url: '/new'})
  }

  function toggleLibrary() {
    mainState.context.library.send('LIBRARY.TOGGLE')
  }

  let title = getDocumentTitle(mainState.context.document)
  console.log('Current Location: ', window.location.pathname)

  return (
    <TopbarStyled data-tauri-drag-region>
      <span style={{display: 'block', flex: 'none', width: 60}} />
      <Box css={{display: 'flex'}} {...draggableProps}>
        <TopbarButton
          color="muted"
          data-testid="history-back"
          onClick={(e) => {
            e.preventDefault()
            back()
          }}
        >
          <Icon name="ArrowChevronLeft" color="muted" size="2" />
        </TopbarButton>
        <TopbarButton
          color="muted"
          data-testid="history-forward"
          onClick={(e) => {
            e.preventDefault()
            forward()
          }}
        >
          <Icon name="ArrowChevronRight" color="muted" size="2" />
        </TopbarButton>
      </Box>
      <Box
        css={{flex: 1, display: 'flex', alignItems: 'baseline', gap: '$2'}}
        data-tauri-drag-region
      >
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
      <TopbarButton onClick={onCreateDraft}>
        <Icon name="Add" color="muted" />
      </TopbarButton>
    </TopbarStyled>
  )
}

function getDocumentTitle(document: any) {
  let titleText = document?.content
    ? getTitleFromContent({
        children: document.content,
      })
    : document?.title ?? ''

  return titleText.length < 50 ? titleText : `${titleText.substring(0, 49)}...`
}
