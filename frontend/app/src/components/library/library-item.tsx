import {
  deleteDraft as defaultDeleteDraft,
  deletePublication as defaultDeletePublication,
  Document,
  Publication,
} from '@app/client'
import {MINTTER_LINK_PREFIX} from '@app/constants'
import {Dropdown, ElementDropdown} from '@app/editor/dropdown'
import {useMainPage} from '@app/main-page-context'
import {styled} from '@app/stitches.config'
import {copyTextToClipboard as defaultCopyTextToClipboard} from '@app/utils/copy-to-clipboard'
import {useRoute} from '@app/utils/use-route'
import {DeleteDialog} from '@components/delete-dialog'
import {Icon} from '@components/icon'
import {useCreateDraft} from '@components/library/use-create-draft'
import {sidepanelModel, useSidepanel} from '@components/sidepanel'
import {Text} from '@components/text'
import {PropsWithChildren} from 'react'
import toast from 'react-hot-toast'
import {Link, useLocation} from 'wouter'

export type LibraryItemProps = {
  publication?: Publication
  draft?: Document
  href: string
  deleteDraft?: typeof defaultDeleteDraft
  deletePublication?: typeof defaultDeletePublication
  copyTextToClipboard?: typeof defaultCopyTextToClipboard
}

export function LibraryItem({
  publication,
  draft,
  href,
  deleteDraft = defaultDeleteDraft,
  deletePublication = defaultDeletePublication,
  copyTextToClipboard = defaultCopyTextToClipboard,
}: PropsWithChildren<LibraryItemProps>) {
  const {match} = useRoute(href)
  const [, setLocation] = useLocation()
  const sidepanelService = useSidepanel()
  const mainService = useMainPage()
  const {createDraft} = useCreateDraft()

  async function onCopy() {
    if (publication) {
      await copyTextToClipboard(`mtt://${publication.document?.id}/${publication.version}`)
      toast.success('Document ID copied successfully', {position: 'top-center'})
    }
  }

  function onMainPanel() {
    setLocation(href)
  }

  function onSidepanel() {
    if (publication) {
      sidepanelService.send(
        sidepanelModel.events['SIDEPANEL.ADD']({
          type: 'publication',
          url: `${MINTTER_LINK_PREFIX}${publication.document?.id}/${publication.version}`,
        }),
      )
      sidepanelService.send('SIDEPANEL.OPEN')
    }
  }
  function afterDelete() {
    if (match) {
      setLocation('/')
    }
    mainService.send('RECONCILE')
  }

  async function onStartDraft() {
    createDraft(onSidepanel)
  }

  let title = publication ? publication.document?.title : draft && draft.title ? draft?.title : 'Untitled Document'

  return (
    <StyledItem active={match} data-testid="library-item">
      <Link href={href}>
        <Text size="2" className="title" color="primary">
          {title}
        </Text>
      </Link>
      <Dropdown.Root>
        <Dropdown.Trigger asChild>
          <ElementDropdown
            data-trigger
            className="dropdown"
            css={{
              backgroundColor: 'transparent',
            }}
          >
            <Icon name="MoreHorizontal" size="1" color="muted" />
          </ElementDropdown>
        </Dropdown.Trigger>
        <Dropdown.Content align="start" data-testid="library-item-dropdown-root">
          <Dropdown.Item data-testid="copy-item" disabled={!!draft} onSelect={onCopy}>
            <Icon name="Copy" size="1" />
            <Text size="2">Copy Document ID</Text>
          </Dropdown.Item>
          <Dropdown.Item data-testid="mainpanel-item" onSelect={onMainPanel}>
            <Icon size="1" name="ArrowTopRight" />
            <Text size="2">Open in main panel</Text>
          </Dropdown.Item>
          <Dropdown.Item data-testid="sidepanel-item" onSelect={onSidepanel}>
            <Icon size="1" name="ArrowBottomRight" />
            <Text size="2">Open in sidepanel</Text>
          </Dropdown.Item>
          <DeleteDialog
            entryId={publication ? publication.document?.id : draft?.id}
            handleDelete={publication ? deletePublication : deleteDraft}
            onSuccess={afterDelete}
            title="Delete document"
            description="Are you sure you want to delete this document? This action is not reversible."
          >
            <Dropdown.Item data-testid="delete-item" onSelect={(e) => e.preventDefault()}>
              <Icon size="1" name="Close" />
              <Text size="2">Delete Document</Text>
            </Dropdown.Item>
          </DeleteDialog>
          <Dropdown.Item onSelect={onStartDraft}>
            <Icon size="1" name="AddCircle" />
            <Text size="2">Start a Draft</Text>
          </Dropdown.Item>
        </Dropdown.Content>
      </Dropdown.Root>
    </StyledItem>
  )
}

export var StyledItem = styled(
  'li',
  {
    $$bg: 'transparent',
    $$bgHover: '$colors$background-neutral-strong',
    $$foreground: '$colors$text-default',
    display: 'flex',
    alignItems: 'center',
    position: 'relative',
    borderRadius: '$2',
    backgroundColor: '$$bg',
    '&:hover': {
      cursor: 'pointer',
      backgroundColor: '$$bgHover',
      '.dropdown': {
        opacity: 1,
      },
    },
    '.title': {
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
          $$bg: '$colors$primary-soft',
          $$bgHover: '$colors$primary-default',
          $$foreground: '$colors$text-opposite',
        },
      },
    },
  },
)
