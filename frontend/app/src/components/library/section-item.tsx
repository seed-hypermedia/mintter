import {Document} from '@app/client'
import {useMainPage} from '@app/main-page-context'
import {styled} from '@app/stitches.config'
import {useRoute} from '@app/utils/use-route'
import {StyledItem} from '@components/library/library-item'
import {Text} from '@components/text'
import {useActor} from '@xstate/react'
import {MouseEvent} from 'react'
import {useLocation} from 'wouter'
import {Alert} from '../alert'
import {Box} from '../box'
import {Icon} from '../icon'

export function SectionItem({
  document,
  href,
  onClick,
  isDraft = false,
}: {
  document?: Document
  onClick?: any
  href: string
  isDraft?: boolean
}) {
  // TODO: include delete machine to publicationMachine
  const [, setLocation] = useLocation()
  const {match} = useRoute(href)
  const mainService = useMainPage()
  const [mainState] = useActor(mainService)

  if (!document) return null
  return (
    <StyledItem onClick={onClick}>
      <Text size="2">{document.title || 'Untitled Document'}</Text>
      <Alert.Root
        id={document.id}
        open={deleteState.matches('open')}
        onOpenChange={(value: boolean) =>
          value ? deleteSend({type: 'OPEN_DIALOG', entryId: document.id, isDraft}) : deleteSend('CANCEL')
        }
      >
        <Alert.Trigger
          onClick={(e) => {
            e.stopPropagation()
            e.preventDefault()
            deleteSend({type: 'OPEN_DIALOG', entryId: document.id, isDraft})
          }}
          css={{opacity: 0, '&:hover': {opacity: 1}}}
        >
          <Icon name="Close" size="1" css={{color: '$$foreground'}} />
        </Alert.Trigger>
        <Alert.Content>
          <Alert.Title color="danger">Delete document</Alert.Title>
          <Alert.Description>
            Are you sure you want to delete this document? This action is not reversible.
          </Alert.Description>
          <Alert.Actions>
            <Alert.Cancel>Cancel</Alert.Cancel>
            <Alert.Action
              color="danger"
              onClick={(e: MouseEvent<HTMLButtonElement>) => {
                e.stopPropagation()
                e.preventDefault()
                deleteSend('CONFIRM')
              }}
            >
              Delete
            </Alert.Action>
          </Alert.Actions>
        </Alert.Content>
      </Alert.Root>
    </StyledItem>
  )
}

export const StyledSectionItem = styled(
  Box,
  {
    $$bg: 'transparent',
    $$bgHover: '$colors$background-neutral-strong',
    display: 'flex',
    color: '$$foreground',
    gap: '$3',
    alignItems: 'center',
    paddingHorizontal: '$3',
    paddingVertical: '$2',
    borderRadius: '$2',
    backgroundColor: '$$bg',
    '&:hover': {
      cursor: 'pointer',
      backgroundColor: '$$bgHover',
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
        },
      },
    },
  },
)

export const StyledSectionItemTitle = styled(
  'span',
  {
    $$foreground: '$colors$text-default',
    display: 'block',
    fontFamily: '$default',
    margin: 0,
    fontSize: '$2',
    letterSpacing: '0.01em',
    lineHeight: '$2',
    flex: '1',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    color: '$$foreground',
  },
  {
    defaultVariants: {
      active: false,
    },
    variants: {
      active: {
        true: {
          $$foreground: 'white',
        },
      },
    },
  },
)
