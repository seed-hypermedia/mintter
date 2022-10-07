import {MINTTER_LINK_PREFIX} from '@app/constants'
import {Dropdown} from '@app/editor/dropdown'
import {Find} from '@app/editor/find'
import {useCurrentFile, useIsEditing, useMain} from '@app/main-context'
import {CurrentFile, PublicationRef} from '@app/main-machine'
import {classnames} from '@app/utils/classnames'
import {copyTextToClipboard} from '@app/utils/copy-to-clipboard'
import {Icon} from '@components/icon'
import {Text} from '@components/text'
import {TippingModal} from '@components/tipping-modal'
import {useActor, useSelector} from '@xstate/react'
import {useMemo} from 'react'
import '../styles/topbar.scss'
type TopbarProps = {
  onLibraryToggle: () => void
  onBack?: () => void
  onForward?: () => void
}
export function Topbar({onLibraryToggle, onBack, onForward}: TopbarProps) {
  let mainService = useMain()
  let [mainState] = useActor(mainService)
  let currentFile = useCurrentFile()
  let isEditing = useIsEditing()
  let isPublication = useMemo(() => {
    if (!currentFile) return null
    return currentFile.id.startsWith('pub-')
  }, [currentFile])
  return (
    <div
      data-layout-section="topbar"
      className={classnames('topbar', 'macos', {visible: !isEditing})}
      {...draggableProps}
    >
      <div className="topbar-section main">
        {currentFile ? (
          <FileTitle fileRef={currentFile} isPublication={isPublication} />
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
      </div>
      <div className="topbar-section actions">
        {currentFile && isPublication ? (
          <PublicationActions fileRef={currentFile} />
        ) : null}
        {currentFile && !isPublication ? (
          <button className="topbar-button success outlined">Done</button>
        ) : null}
        <Find />
        <button
          className="topbar-button primary outlined"
          onClick={() => mainService.send('COMMIT.OPEN.WINDOW')}
        >
          <Icon name="Add" size="2" />
          <span>New Document</span>
        </button>
        <div className="button-group">
          <button
            data-testid="history-back"
            onClick={onBack ? onBack : () => mainService.send('GO.BACK')}
            className="topbar-button"
          >
            <Icon name="ArrowChevronLeft" size="2" color="muted" />
          </button>
          <button
            data-testid="history-forward"
            onClick={
              onForward ? onForward : () => mainService.send('GO.FORWARD')
            }
            className="topbar-button "
          >
            <Icon name="ArrowChevronRight" size="2" color="muted" />
          </button>
        </div>
        <button
          data-testid="library-toggle-button"
          onClick={onLibraryToggle}
          className="topbar-button"
        >
          <Icon name="HamburgerMenu" size="2" color="muted" />
        </button>
      </div>
    </div>
  )
}

function FileTitle({
  fileRef,
  isPublication,
}: {
  fileRef: CurrentFile
  isPublication: boolean | null
}) {
  let [fileState] = useActor(fileRef)

  return (
    <>
      <TopbarTitle {...draggableProps} title={fileState.context.title} />
      {isPublication ? (
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
          {fileState.context.author?.profile?.alias || '...'}
        </Text>
      ) : null}
    </>
  )
}

function TopbarTitle({title}: {title: string}) {
  return (
    <span
      data-testid="topbar-title"
      className="topbar-title"
      {...draggableProps}
    >
      <span {...draggableProps}>{title}</span>
    </span>
  )
}

function PublicationActions({fileRef}: {fileRef: CurrentFile}) {
  const mainService = useMain()
  let isReplying = useSelector(mainService, (state) =>
    state.matches('routes.publication.replying'),
  )
  const [state] = useActor(fileRef)

  async function handleCopy() {
    await copyTextToClipboard(
      `${MINTTER_LINK_PREFIX}${state.context.documentId}/${state.context.version}`,
    )
  }
  return (
    <Dropdown.Root modal={false}>
      <Dropdown.Trigger asChild>
        <button className="topbar-button dropdown success">
          <span>Write</span>
          <Icon name="CaretDown" />
        </button>
      </Dropdown.Trigger>
      <Dropdown.Portal>
        <Dropdown.Content alignOffset={-5} align="end">
          <Dropdown.Item
            onSelect={() => mainService.send('COMMIT.CREATE.REPLY')}
            disabled={isReplying}
          >
            <Icon name="MessageBubble" />
            <span>Reply</span>
          </Dropdown.Item>
          {state.context.canUpdate ? (
            <Dropdown.Item
              onSelect={() => {
                // noop
              }}
            >
              <Icon name="Pencil" />
              <span>Edit</span>
            </Dropdown.Item>
          ) : (
            <TippingModal fileRef={fileRef as PublicationRef} />
          )}
          <Dropdown.Item
            onSelect={() => mainService.send('COMMIT.OPEN.WINDOW')}
          >
            <Icon name="File" />
            <span>New Docuent</span>
          </Dropdown.Item>
          <Dropdown.Item>
            <Icon name="PencilAdd" />
            <span>Review</span>
          </Dropdown.Item>
          <Dropdown.Item onSelect={handleCopy}>
            <Icon name="Copy" />
            <span>Copy Reference</span>
          </Dropdown.Item>
          <Dropdown.Separator color="muted" />
        </Dropdown.Content>
      </Dropdown.Portal>
    </Dropdown.Root>
  )
}

var draggableProps = {
  'data-tauri-drag-region': true,
}
