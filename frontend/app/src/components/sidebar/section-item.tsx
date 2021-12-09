import {Document} from '@mintter/client'
import {Box} from '@mintter/ui/box'
import {Alert} from '@mintter/ui/dialog'
import {Icon} from '@mintter/ui/icon'
import {styled} from '@mintter/ui/stitches.config'
import {useMachine} from '@xstate/react'
import {MouseEvent} from 'react'
import {useQueryClient} from 'react-query'
import {useLocation} from 'wouter'
import {assign} from 'xstate'
import {deleteDialogMachine} from '../../delete-dialog-machine'
import {queryKeys} from '../../hooks'
import {useRoute} from '../../utils/use-route'

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
  const [, setLocation] = useLocation()
  const {match} = useRoute(href)
  const client = useQueryClient()
  const [deleteState, deleteSend] = useMachine(
    deleteDialogMachine.withConfig({
      actions: {
        onSuccess: assign((context) => {
          if (window.location.href.includes(context.entryId)) {
            console.log('SI QUE INCLUYE!', window.location.href, context.entryId)
            setLocation('/library')
          } else {
            console.log('NOO QUE INCLUYE!', window.location.href, context.entryId)
          }

          if (context.isDraft) {
            client.refetchQueries(queryKeys.GET_DRAFT_LIST)
          } else {
            client.refetchQueries(queryKeys.GET_PUBLICATION_LIST)
          }

          return {
            entryId: '',
            errorMessage: '',
            isDraft: false,
          }
        }),
      },
    }),
  )

  if (!document) return null
  return (
    <StyledSectionItem active={match} onClick={onClick}>
      <StyledSectionItemTitle size="2" active={match}>
        {document.title ? document.title : 'Untitled Document'}
      </StyledSectionItemTitle>
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
    </StyledSectionItem>
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
