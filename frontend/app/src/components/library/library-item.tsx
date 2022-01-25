import {Document, Publication} from '@app/client'
import {Dropdown, ElementDropdown} from '@app/editor/dropdown'
import {styled} from '@app/stitches.config'
import {copyTextToClipboard} from '@app/utils/copy-to-clipboard'
import {useRoute} from '@app/utils/use-route'
import {Icon} from '@components/icon'
import {Text} from '@components/text'
import {PropsWithChildren} from 'react'
import toast from 'react-hot-toast'
import {info} from 'tauri-plugin-log-api'
import {Link, useLocation} from 'wouter'

export type LibraryItemProps = {
  publication?: Publication
  draft?: Document
  href: string
}

export function LibraryItem({publication, draft, href}: PropsWithChildren<LibraryItemProps>) {
  const {match} = useRoute(href)
  const [, setLocation] = useLocation()
  async function onCopy(event: Event) {
    // let link = publication
    //   ? `mtt://${publication.document?.id}/${publication.version}`
    //   : draft
    //   ? `mtt://${draft.id}`
    //   : ''

    // if (link) {
    //   copyTextToClipboard(link).then(() => {
    //     toast.success('Document ID copied successfully', {position: 'top-center'})
    //   })
    // }

    if (publication) {
      copyTextToClipboard(`mtt://${publication.document?.id}/${publication.version}`).then(() => {
        toast.success('Document ID copied successfully', {position: 'top-center'})
      })
    }
  }

  function onMainPanel() {
    setLocation(href)
  }

  function onSidepanel() {
    info('onSidepanel: TBD')
  }
  function onDelete() {
    info('onDelete: TBD')
  }
  function onStartDraft() {
    info('onStartDraft: TBD')
  }

  let title = publication ? publication.document?.title : draft ? draft?.title : 'Untitled Document'

  return (
    <StyledItem active={match}>
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
              '&:hover': {
                color: 'inherit',
              },
            }}
          >
            <Icon name="MoreHorizontal" size="1" color="muted" />
          </ElementDropdown>
        </Dropdown.Trigger>
        <Dropdown.Content align="start">
          <Dropdown.Item onSelect={onCopy}>Copy Document ID</Dropdown.Item>
          <Dropdown.Item onSelect={onMainPanel}>Open in main panel</Dropdown.Item>
          <Dropdown.Item onSelect={onSidepanel}>Open in sidepanel</Dropdown.Item>
          <Dropdown.Item onSelect={onDelete}>Delete</Dropdown.Item>
          <Dropdown.Item onSelect={onStartDraft}>Start a Draft</Dropdown.Item>
        </Dropdown.Content>
      </Dropdown.Root>
    </StyledItem>
  )
}

var StyledItem = styled(
  'li',
  {
    $$bg: 'transparent',
    $$bgHover: '$colors$background-neutral-strong',
    $$foreground: '$colors$text-default',
    display: 'flex',
    // gap: '$3',
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
