import {deleteFileMachine} from '@app/delete-machine'
import {debug} from '@app/utils/logger'
import {Alert} from '@components/alert'
import {overlayStyles} from '@components/dialog-styles'
import {useActor} from '@xstate/react'
import {MouseEvent, PropsWithChildren} from 'react'
import {InterpreterFrom} from 'xstate'

export type DeleteDialogProps = PropsWithChildren<{
  title: string
  description: string
  deleteRef: InterpreterFrom<typeof deleteFileMachine>
}>

export function DeleteDialog({
  children,
  deleteRef,
  title,
  description,
}: DeleteDialogProps) {
  let [state, send] = useActor(deleteRef)
  return (
    <Alert.Root
      open={state.matches('open')}
      onOpenChange={(newVal: boolean) => {
        debug('TOGGLE ALERT', state.value, newVal)
        newVal ? send('DELETE.OPEN') : send('DELETE.CANCEL')
      }}
    >
      <Alert.Trigger asChild>{children}</Alert.Trigger>
      <Alert.Portal>
        <Alert.Overlay className={overlayStyles()} />
        <Alert.Content>
          <Alert.Title color="danger" data-testid="delete-dialog-title">
            {title}
          </Alert.Title>
          <Alert.Description>{description}</Alert.Description>
          {state.context.errorMessage && (
            <Alert.Description data-testid="delete-dialog-error" color="danger">
              Something went wrong on deletion
            </Alert.Description>
          )}
          <Alert.Actions>
            <Alert.Cancel
              data-testid="delete-dialog-cancel"
              disabled={state.matches('open.deleting')}
            >
              Cancel
            </Alert.Cancel>
            <Alert.Action
              color="danger"
              data-testid="delete-dialog-confirm"
              disabled={state.matches('open.deleting')}
              onClick={(e: MouseEvent<HTMLButtonElement>) => {
                e.stopPropagation()
                e.preventDefault()
                send('DELETE.CONFIRM')
              }}
            >
              Delete
            </Alert.Action>
          </Alert.Actions>
        </Alert.Content>
      </Alert.Portal>
    </Alert.Root>
  )
}
