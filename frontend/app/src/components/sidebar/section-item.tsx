import {deleteDraft, deletePublication, Document} from '@mintter/client'
import {Box} from '@mintter/ui/box'
import {Alert} from '@mintter/ui/dialog'
import {Icon} from '@mintter/ui/icon'
import {Text} from '@mintter/ui/text'
import {useMachine} from '@xstate/react'
import {useQueryClient} from 'react-query'
import {useLocation} from 'wouter'
import {assign} from 'xstate'
import {createModel} from 'xstate/lib/model'
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
    machine.withConfig({
      services: {
        executeAction: (context) =>
          context.isDraft ? deleteDraft(context.entryId) : deletePublication(context.entryId),
      },
      actions: {
        onSuccess: assign((context) => {
          if (window.location.href.includes(context.entryId)) {
            console.log('SI QUE INCLUYE!', window.location.href, context.entryId)
            setLocation('/library')
          } else {
            console.log('NOO QUE INCLUYE!', window.location.href, context.entryId)
          }

          if (context.isDraft) {
            client.refetchQueries('DraftsList')
          } else {
            client.refetchQueries('PublicationList')
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
    <Box
      onClick={onClick}
      css={{
        $$bg: match ? '$colors$primary-soft' : 'transparent',
        $$bgHover: match ? '$colors$primary-default' : '$colors$background-neutral-strong',
        $$foreground: match ? 'white' : '$colors$text-default',
        display: 'flex',
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
      }}
    >
      <Icon name="File" size="1" css={{color: '$$foreground'}} />
      <Text
        size="2"
        css={{flex: '1', textOverflow: 'ellipsis', whiteSpace: 'nowrap', overflow: 'hidden', color: '$$foreground'}}
      >
        {document.title ? document.title : 'Untitled Document'}
      </Text>
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
              onClick={(e) => {
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
    </Box>
  )
}

var deleteConfirmationModel = createModel(
  {
    entryId: '',
    isDraft: false,
    errorMessage: '',
  },
  {
    events: {
      OPEN_DIALOG: ({entryId, isDraft}: {entryId: string; isDraft: boolean}) => ({entryId, isDraft}),
      CANCEL: () => ({}),
      CONFIRM: () => ({}),
    },
  },
)

const assignDataToContext = deleteConfirmationModel.assign(
  {
    entryId: (_, event) => {
      console.log(_, event)
      return event.entryId
    },
    isDraft: (_, event) => event.isDraft,
  },
  'OPEN_DIALOG',
)

const clearDataFromContext = deleteConfirmationModel.assign({
  entryId: '',
  isDraft: false,
  errorMessage: '',
})

var machine = deleteConfirmationModel.createMachine(
  {
    id: 'deleteConfirmationDialog',
    context: deleteConfirmationModel.initialContext,
    initial: 'closed',
    states: {
      closed: {
        id: 'closed',
        on: {
          OPEN_DIALOG: {
            target: 'open',
            actions: assignDataToContext,
          },
        },
      },
      open: {
        exit: ['clearErrorMessage'],
        initial: 'idle',
        states: {
          idle: {
            on: {
              CANCEL: {
                target: 'dismiss',
                actions: clearDataFromContext,
              },
              CONFIRM: 'confirmed',
            },
          },
          confirmed: {
            invoke: {
              src: 'executeAction',
              onError: {
                target: 'idle',
                actions: deleteConfirmationModel.assign({
                  errorMessage: 'invoke error',
                }),
              },
              onDone: {
                target: 'dismiss',
                actions: ['onSuccess'],
              },
            },
          },
          dismiss: {
            type: 'final',
          },
        },
        onDone: {
          target: 'closed',
          actions: assign((ctx, ev) => {
            console.log('to Closed action: ', ctx, ev)
            return {}
          }),
        },
      },
    },
  },
  {
    services: {
      executeAction: (context) => (context.isDraft ? deleteDraft(context.entryId) : deletePublication(context.entryId)),
    },
    actions: {
      clearErrorMessage: assign({
        errorMessage: '',
      }),
    },
  },
)
