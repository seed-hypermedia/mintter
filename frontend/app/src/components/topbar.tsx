import {getTitleFromContent} from '@app/editor/use-editor-draft'
import {useFiles, useMainPage} from '@app/main-page-context'
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

export function Topbar() {
  let mainPage = useMainPage()
  let [mainState] = useActor(mainPage)
  let files = useFiles()

  async function onCreateDraft() {
    await invoke('open_in_new_window', {url: '/new'})
  }

  function toggleLibrary() {
    mainState.context.library.send('LIBRARY.TOGGLE')
  }

  let title = getDocumentTitle(mainState.context.currentDocument)

  return (
    <TopbarStyled data-tauri-drag-region>
      <span style={{display: 'block', flex: 'none', width: 60}} />
      <Box css={{display: 'flex'}} {...draggableProps}>
        <TopbarButton
          color="muted"
          onClick={(e) => {
            e.preventDefault()
            window.history.back()
          }}
        >
          <Icon name="ArrowChevronLeft" color="muted" size="2" />
        </TopbarButton>
        <TopbarButton
          color="muted"
          onClick={(e) => {
            e.preventDefault()
            window.history.forward()
          }}
        >
          <Icon name="ArrowChevronRight" color="muted" size="2" />
        </TopbarButton>
      </Box>
      <Box css={{flex: 1}} data-tauri-drag-region>
        <Text size="3" fontWeight="medium" data-tauri-drag-region>
          {title}
        </Text>
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

function getDocumentTitle(currentDocument: any) {
  let titleText = currentDocument?.content
    ? getTitleFromContent({
        children: currentDocument.content,
      })
    : currentDocument?.title ?? ''

  return titleText.length < 50 ? titleText : `${titleText.substring(0, 49)}...`
}
