import {
  deleteDraft as defaultDeleteDraft,
  deletePublication as defaultDeletePublication,
} from '@app/client'
import {Dropdown, ElementDropdown} from '@app/editor/dropdown'
import {useMainPage, useParams} from '@app/main-page-context'
import {DraftRef, PublicationRef} from '@app/main-page-machine'
import {css, styled} from '@app/stitches.config'
import {copyTextToClipboard} from '@app/utils/copy-to-clipboard'
import {DeleteDialog, deleteDialogMachine} from '@components/delete-dialog'
import {Icon} from '@components/icon'
import {Text} from '@components/text'
import {useActor, useMachine} from '@xstate/react'
import {PropsWithChildren, useMemo} from 'react'
import toast from 'react-hot-toast'

export type LibraryItemProps = {
  fileRef: PublicationRef | DraftRef
  deleteDraft?: typeof defaultDeleteDraft
  deletePublication?: typeof defaultDeletePublication
  copy?: typeof copyTextToClipboard
}

let hoverIconStyle = css({
  color: '$base-text-opposite !important',
})

export function LibraryItem({
  fileRef,
  copy = copyTextToClipboard,
}: PropsWithChildren<LibraryItemProps>) {
  const mainService = useMainPage()
  const [mainState] = useActor(mainService)
  const [state] = useActor(fileRef)
  let params = useParams()
  let isPublication = useMemo(() => fileRef.id.startsWith('pub-'), [])
  let match = useMemo(() => {
    if (isPublication) {
      return (
        state.context.documentId == params.docId &&
        state.context.version == params.version
      )
    } else {
      return state.context.documentId == params.docId
    }
  }, [params.docId, params.version])

  const [deleteState, deleteSend] = useMachine(() => deleteDialogMachine, {
    actions: {
      deleteConfirm: () => {
        mainService.send({
          type: 'COMMIT.DELETE.FILE',
          ref: state.context.documentId,
        })
      },
    },
  })

  async function onCopy() {
    if (isPublication) {
      await copyTextToClipboard(
        `mtt://${state.context.documentId}/${state.context.version}`,
      )
      toast.success('Document ID copied successfully', {position: 'top-center'})
    }
  }

  function goToItem() {
    if (match) return

    if (isPublication) {
      mainService.send({
        type: 'GO.TO.PUBLICATION',

        docId: state.context.documentId,
        version: state.context.version,
        blockId: undefined,
      })
    } else {
      mainService.send({type: 'GO.TO.EDITOR', docId: state.context.documentId})
    }
  }

  async function onOpenInNewWindow() {
    mainService.send({
      type: 'COMMIT.OPEN.WINDOW',
      path: isPublication
        ? `/p/${state.context.documentId}/${state.context.version}`
        : `/editor/${state.context.documentId}`,
    })
  }

  let title = state.context.title || 'Untitled Document'

  return (
    <StyledItem active={match} data-testid="library-item">
      <Text size="2" className="title" color="primary" onClick={goToItem}>
        {title}
      </Text>

      <Dropdown.Root modal={false}>
        <Dropdown.Trigger asChild>
          <ElementDropdown
            data-trigger
            className="dropdown"
            css={{
              backgroundColor: 'transparent',
            }}
          >
            <Icon
              name="MoreHorizontal"
              size="1"
              color="muted"
              className={match ? hoverIconStyle : null}
            />
          </ElementDropdown>
        </Dropdown.Trigger>
        <Dropdown.Content
          align="start"
          data-testid="library-item-dropdown-root"
          hidden={deleteState.matches('opened')}
        >
          <Dropdown.Item
            data-testid="copy-item"
            disabled={!isPublication}
            onSelect={onCopy}
          >
            <Icon name="Copy" size="1" />
            <Text size="2">Copy Document ID</Text>
          </Dropdown.Item>
          <Dropdown.Item data-testid="mainpanel-item" onSelect={goToItem}>
            <Icon size="1" name="ArrowTopRight" />
            <Text size="2">Open in main panel</Text>
          </Dropdown.Item>
          <Dropdown.Item
            data-testid="new-window-item"
            onSelect={onOpenInNewWindow}
          >
            <Icon size="1" name="OpenInNewWindow" />
            <Text size="2">Open in new Window</Text>
          </Dropdown.Item>
          <DeleteDialog
            state={deleteState}
            send={deleteSend}
            title="Delete document"
            description="Are you sure you want to delete this document? This action is not reversible."
          >
            <Dropdown.Item
              data-testid="delete-item"
              onSelect={(e) => e.preventDefault()}
            >
              <Icon size="1" name="Close" />
              <Text size="2">Delete Document</Text>
            </Dropdown.Item>
          </DeleteDialog>
        </Dropdown.Content>
      </Dropdown.Root>
    </StyledItem>
  )
}

export var StyledItem = styled(
  'li',
  {
    $$bg: 'transparent',
    $$bgHover: '$colors$base-component-bg-hover',
    $$foreground: '$colors$base-text-high',
    display: 'flex',
    minHeight: 28,
    alignItems: 'center',
    position: 'relative',
    borderRadius: '$1',
    backgroundColor: '$$bg',
    '&:hover': {
      cursor: 'pointer',
      backgroundColor: '$$bgHover',
      '.dropdown': {
        opacity: 1,
      },
    },
    '.title': {
      userSelect: 'none',
      letterSpacing: '0.01em',
      lineHeight: '$2',
      textOverflow: 'ellipsis',
      whiteSpace: 'nowrap',
      overflow: 'hidden',
      color: '$$foreground',
      flex: 1,
      paddingHorizontal: '$3',
      paddingVertical: '$2',
    },
    '.dropdown': {
      opacity: 0,
    },
  },
  {
    defaultVariants: {
      active: false,
    },
    variants: {
      active: {
        true: {
          $$bg: '$colors$primary-normal',
          $$bgHover: '$colors$primary-active',
          $$foreground: '$colors$primary-text-opposite',
        },
      },
    },
  },
)
