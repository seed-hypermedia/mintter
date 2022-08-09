import {mainService as defaultMainService} from '@app/app-providers'
import {useAccountProfile} from '@app/auth-context'
import {MINTTER_LINK_PREFIX} from '@app/constants'
import {Dropdown, dropdownLabel} from '@app/editor/dropdown'
import {CurrentFile, DraftRef, PublicationRef} from '@app/main-machine'
import {css, styled} from '@app/stitches.config'
import {copyTextToClipboard} from '@app/utils/copy-to-clipboard'
import {useBookmarksService} from '@components/bookmarks'
import {Button} from '@components/button'
import {Text} from '@components/text'
import {TippingModal} from '@components/tipping-modal'
import {Tooltip} from '@components/tooltip'
import {useActor} from '@xstate/react'
import toast from 'react-hot-toast'
import {Box} from './box'
import {Icon} from './icon'

type TopbarProps = {
  copy?: typeof copyTextToClipboard
  currentFile?: CurrentFile | null
  mainService?: typeof defaultMainService
}

const draggableProps = {
  'data-tauri-drag-region': true,
}

export function Topbar({mainService = defaultMainService}: TopbarProps) {
  let [mainState] = useActor(mainService)

  return (
    <Box
      data-layout-section="topbar"
      className={wrapperStyles()}
      {...draggableProps}
    >
      <Box
        data-topbar-section="main"
        className={topbarSectionStyles({type: 'main'})}
        {...draggableProps}
      >
        {mainState.context.currentFile ? (
          <FileTitle fileRef={mainState.context.currentFile} />
        ) : (
          <TopbarTitle
            title={
              mainState.matches('routes.draftList')
                ? 'Drafts'
                : mainState.matches('routes.publicationList') ||
                  mainState.matches('routes.home')
                ? 'Publications'
                : ''
            }
          />
        )}
      </Box>
      {mainState.context.currentFile ? (
        <TopbarFileActions
          mainService={mainService}
          fileRef={mainState.context.currentFile}
        />
      ) : null}

      <TopbarLibrarySection mainService={mainService} />
    </Box>
  )
}

function FileTitle({fileRef}: {fileRef: CurrentFile}) {
  let [fileState] = useActor(fileRef)

  return (
    <>
      <TopbarTitle {...draggableProps} title={fileState.context.title} />
      {fileRef.id.startsWith('pub-') ? (
        <Text
          size="1"
          color="muted"
          css={{
            userSelect: 'none',
            textDecoration: 'underline',
            whiteSpace: 'nowrap',
            '&:hover': {
              cursor: 'default',
            },
          }}
          data-testid="topbar-author"
          {...draggableProps}
        >
          {fileState.context.author?.profile?.alias || 'AUTHOR'}
        </Text>
      ) : null}
    </>
  )
}

function TopbarLibrarySection({
  mainService,
}: {
  mainService: typeof defaultMainService
}) {
  let [state, send] = useActor(mainService)
  let profile = useAccountProfile()

  function toggleLibrary() {
    state.context.library.send('LIBRARY.TOGGLE')
  }

  return (
    <Box
      data-topbar-section="library"
      className={topbarSectionStyles()}
      {...draggableProps}
    >
      <TopbarButton
        data-testid="history-back"
        onClick={(e) => {
          e.preventDefault()
          send('GO.BACK')
        }}
      >
        <Icon name="ArrowChevronLeft" color="muted" size="2" />
      </TopbarButton>
      <TopbarButton
        data-testid="history-forward"
        onClick={(e) => {
          e.preventDefault()
          send('GO.FORWARD')
        }}
      >
        <Icon name="ArrowChevronRight" color="muted" size="2" />
      </TopbarButton>
      <Box
        css={{
          display: 'flex',
          flex: 1,
          justifyContent: 'end',
          paddingInlineEnd: '$2',
        }}
        {...draggableProps}
      >
        <TopbarButton
          css={{
            flex: 'none',
            display: 'flex',
            alignItems: 'center',
            gap: '$3',
            height: '$full',
            paddingHorizontal: '$3',
          }}
          onClick={toggleLibrary}
          data-tauri-drag-region
        >
          <Text size="2">{profile?.alias}</Text>
          <Icon name="Sidenav" size="2" />
        </TopbarButton>
      </Box>
    </Box>
  )
}

function TopbarFileActions({
  fileRef,
  mainService = defaultMainService,
}: {
  fileRef: CurrentFile
  mainService: typeof defaultMainService
}) {
  if (fileRef.id.startsWith('draft-')) {
    return <DraftActions fileRef={fileRef as DraftRef} />
  } else {
    return (
      <PublicationActions
        mainService={mainService}
        fileRef={fileRef as PublicationRef}
      />
    )
  }
}

function DraftActions({fileRef}: {fileRef: DraftRef}) {
  let [state, send] = useActor(fileRef)
  return (
    <Box
      data-topbar-section="actions"
      className={topbarSectionStyles({type: 'actions'})}
      {...draggableProps}
    >
      <Button
        color="success"
        variant="ghost"
        size="1"
        disabled={!state.can('DRAFT.PUBLISH')}
        data-testid="submit-publish"
        onClick={() => {
          send('DRAFT.PUBLISH')
        }}
      >
        Publish
      </Button>
    </Box>
  )
}

function PublicationActions({
  fileRef,
  copy = copyTextToClipboard,
  mainService = defaultMainService,
}: {
  fileRef: PublicationRef
  copy?: typeof copyTextToClipboard
  mainService: typeof defaultMainService
}) {
  let [state, send] = useActor(fileRef)
  let bookmarkService = useBookmarksService()

  async function onCopyReference() {
    await copy(
      `${MINTTER_LINK_PREFIX}${state.context.publication?.document?.id}/${state.context.publication.version}`,
    )
    toast.success('Document Reference copied successfully', {
      position: 'top-center',
    })
  }

  function onBookmark() {
    bookmarkService.send({
      type: 'BOOKMARK.ADD',
      url: `${MINTTER_LINK_PREFIX}${state.context.publication?.document?.id}/${state.context.publication?.version}`,
    })
  }
  return (
    <Box
      data-topbar-section="actions"
      className={topbarSectionStyles({type: 'actions'})}
      {...draggableProps}
    >
      <Box
        css={{
          display: 'none',
          alignItems: 'center',
          gap: '$3',
          '@bp1': {
            display: 'flex',
          },
        }}
      >
        <Tooltip content="Copy document reference">
          <TopbarButton onClick={onCopyReference}>
            <Icon name="Copy" size="1" />
          </TopbarButton>
        </Tooltip>
        <Tooltip content="Add to boomarks">
          <TopbarButton onClick={onBookmark}>
            <Icon name="ArrowBottomRight" size="1" />
          </TopbarButton>
        </Tooltip>
      </Box>
      <Box
        css={{
          display: 'flex',
          alignItems: 'center',
          '@bp1': {
            display: 'none',
          },
        }}
      >
        <Dropdown.Root>
          <Dropdown.Trigger asChild>
            <TopbarButton css={{padding: '0.3rem'}}>
              <Icon size="1" name="MoreHorizontal" color="muted" />
            </TopbarButton>
          </Dropdown.Trigger>
          <Dropdown.Content alignOffset={-5} align="end">
            {!state.context.canUpdate ? (
              <TippingModal fileRef={fileRef} />
            ) : null}
            <Dropdown.Item onSelect={onCopyReference}>
              <Icon size="1" name="Copy" />
              <span className={dropdownLabel()}>Copy Document Reference</span>
            </Dropdown.Item>
            <Dropdown.Item onSelect={onBookmark}>
              <Icon size="1" name="ArrowBottomRight" />
              <span className={dropdownLabel()}>Add to Bookmarks</span>
            </Dropdown.Item>
          </Dropdown.Content>
        </Dropdown.Root>
      </Box>
      <Dropdown.Root>
        <Tooltip content="Edit Actions">
          <Dropdown.Trigger asChild>
            <TopbarButton
              variant="outlined"
              css={{
                padding: '0.3rem',
              }}
            >
              <Icon size="1" name="Pencil" color="muted" />
              <Icon
                name="ArrowChevronDown"
                color="muted"
                css={{
                  zoom: 0.5,
                }}
              />
            </TopbarButton>
          </Dropdown.Trigger>
        </Tooltip>
        <Dropdown.Content alignOffset={-5} align="end">
          {state.context.canUpdate ? (
            <Dropdown.Item>
              <Icon size="1" name="Pencil" />
              <span className={dropdownLabel()}>Edit</span>
            </Dropdown.Item>
          ) : null}

          <Dropdown.Item
            onSelect={() => mainService.send('COMMIT.OPEN.WINDOW')}
          >
            <Icon size="1" name="File" />
            <span className={dropdownLabel()}>New Document</span>
          </Dropdown.Item>
          <Dropdown.Item>
            <Icon size="1" name="MessageBubble" />
            <span className={dropdownLabel()}>Reply</span>
          </Dropdown.Item>
          <Dropdown.Item>
            <Icon size="1" name="PencilAdd" />
            <span className={dropdownLabel()}>Review</span>
          </Dropdown.Item>
          <Dropdown.Separator color="muted" />
          <Dropdown.Item disabled>
            <Box
              css={{
                paddingBlock: '1rem',
                userSelect: 'none',
              }}
            >
              pub date here
            </Box>
          </Dropdown.Item>
        </Dropdown.Content>
      </Dropdown.Root>
    </Box>
  )
}

var wrapperStyles = css({
  display: 'flex',
  paddingInlineStart: '80px',
  blockSize: '100%',
  borderBottom: '1px solid $colors$base-border-subtle',
  background: '$base-background-subtle',
  '& > *': {
    // align items here
  },
})

var topbarSectionStyles = css({
  display: 'flex',
  alignItems: 'center',
  '& > *': {
    '&:hover': {
      cursor: 'default',
    },
  },
  variants: {
    type: {
      main: {
        flex: 1,
        gap: '0.5rem',
        minWidth: 0,
      },
      actions: {
        paddingInline: '0.5rem',
        gap: '0.5rem',
      },
      library: {
        flex: 'none',

        paddingInline: '0.5rem',
        '@bp2': {
          inlineSize: 'var(--library-size)',
        },
      },
    },
  },
})

var titleStyles = css({
  fontFamily: '$base',
  fontWeight: '$medium',
  userSelect: 'none',
  '@initial': {
    fontSize: '1rem',
  },
  '@bp2': {
    fontSize: '1.1rem',
  },
  maxWidth: '40ch',
  whiteSpace: 'nowrap',
  textOverflow: 'ellipsis',
  overflow: 'hidden',
  '& > *': {
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
})

function TopbarTitle({title}: {title: string}) {
  return (
    <span className={titleStyles()} {...draggableProps}>
      <span {...draggableProps}>{title}</span>
    </span>
  )
}

var TopbarButton = styled('button', {
  all: 'unset',
  padding: '$1',
  gap: '0.3rem',
  inlineSize: '$8',
  blockSize: '$8',
  borderRadius: '$2',
  backgroundColor: 'transparent',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  '&:hover': {
    backgroundColor: '$base-component-bg-hover',
  },
  variants: {
    variant: {
      outlined: {
        '&:hover': {
          boxShadow: 'inset 0px 0px 0px 1px $colors$base-border-normal',
        },
      },
    },
  },
})
