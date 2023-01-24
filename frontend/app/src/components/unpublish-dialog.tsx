import {deleteFileMachine} from '@app/delete-machine'
import {useSiteUnpublish} from '@app/hooks/sites'
import {Alert} from '@components/alert'
import {overlayStyles} from '@components/dialog-styles'
import {ListedWebPublication} from '@mintter/shared/dist/client/.generated/site/v1alpha/site'
import {useActor} from '@xstate/react'
import {MouseEvent, PropsWithChildren, useState} from 'react'
import {toast} from 'react-hot-toast'
import {InterpreterFrom} from 'xstate'

// export type DeleteDialogProps = PropsWithChildren<{
//   title: string
//   description: string
//   deleteRef: InterpreterFrom<typeof deleteFileMachine>
// }>

export function useUnpublishDialog(
  hostname: string,
  pub: ListedWebPublication,
) {
  const [isOpen, setIsOpen] = useState(false)
  const unpublish = useSiteUnpublish()
  const content = (
    <Alert.Root open={isOpen} onOpenChange={setIsOpen}>
      <Alert.Portal>
        <Alert.Overlay className={overlayStyles()} />
        <Alert.Content>
          <Alert.Title color="danger" data-testid="delete-dialog-title">
            Un-Publish from Site
          </Alert.Title>
          <Alert.Description>
            {pub.path == null
              ? `This document may no longer be visible on this site.`
              : `This document will no longer be visible at /${pub.path}`}
          </Alert.Description>
          <Alert.Actions>
            <Alert.Cancel data-testid="delete-dialog-cancel">
              Cancel
            </Alert.Cancel>
            <Alert.Action
              color="danger"
              disabled={unpublish.isLoading}
              data-testid="delete-dialog-confirm"
              onClick={(e: MouseEvent<HTMLButtonElement>) => {
                e.stopPropagation()
                e.preventDefault()
                unpublish
                  .mutateAsync({hostname, publicationId: pub.publicationId})
                  .then(() => {
                    setIsOpen(false)
                  })
                  .catch((e) => {
                    console.error(e)
                    toast('Error un-publishing document', {})
                  })
              }}
            >
              Delete
            </Alert.Action>
          </Alert.Actions>
        </Alert.Content>
      </Alert.Portal>
    </Alert.Root>
  )
  return [
    content,
    () => {
      setIsOpen(true)
    },
  ] as const
}

// export function DeleteDialog({
//   children,
//   deleteRef,
//   title,
//   description,
// }: DeleteDialogProps) {
//   let [state, send] = useActor(deleteRef)
//   return (
//     <Alert.Root
//       open={state.matches('open')}
//       onOpenChange={(newVal: boolean) => {
//         debug('TOGGLE ALERT', state.value, newVal)
//         newVal ? send('DELETE.OPEN') : send('DELETE.CANCEL')
//       }}
//     >
//       <Alert.Trigger asChild>{children}</Alert.Trigger>
//       <Alert.Portal>
//         <Alert.Overlay className={overlayStyles()} />
//         <Alert.Content>
//           <Alert.Title color="danger" data-testid="delete-dialog-title">
//             {title}
//           </Alert.Title>
//           <Alert.Description>{description}</Alert.Description>
//           {state.context.errorMessage && (
//             <Alert.Description data-testid="delete-dialog-error" color="danger">
//               Something went wrong on deletion
//             </Alert.Description>
//           )}
//           <Alert.Actions>
//             <Alert.Cancel
//               data-testid="delete-dialog-cancel"
//               disabled={state.matches('open.deleting')}
//             >
//               Cancel
//             </Alert.Cancel>
//             <Alert.Action
//               color="danger"
//               data-testid="delete-dialog-confirm"
//               disabled={state.matches('open.deleting')}
//               onClick={(e: MouseEvent<HTMLButtonElement>) => {
//                 e.stopPropagation()
//                 e.preventDefault()
//                 send('DELETE.CONFIRM')
//               }}
//             >
//               Delete
//             </Alert.Action>
//           </Alert.Actions>
//         </Alert.Content>
//       </Alert.Portal>
//     </Alert.Root>
//   )
// }
