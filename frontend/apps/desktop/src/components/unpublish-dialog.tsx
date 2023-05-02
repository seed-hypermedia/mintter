import {useSiteUnpublish} from '@app/models/sites'
import {usePopoverState} from '@app/use-popover-state'
import {Alert} from '@components/alert'
import {DeleteDialog} from '@components/delete-dialog'
import {overlayStyles} from '@components/dialog-styles'
import {WebPublicationRecord} from '@mintter/shared'
import {Button} from '@mintter/ui'
import {MouseEvent, useState} from 'react'
import {toast} from 'react-hot-toast'

export function useUnpublishDialog({
  pub = null,
  hostname,
  trigger,
}: {
  pub: WebPublicationRecord | null
  hostname: string
  trigger?: (props: {onPress: () => void}) => JSX.Element
}) {
  const dialogState = usePopoverState()
  const unpublish = useSiteUnpublish()

  return {
    ...dialogState,
    deleteDialog: !pub ? null : (
      <DeleteDialog
        {...dialogState}
        trigger={trigger}
        title="Un-Publish from Site"
        description={
          pub.path == null
            ? `This document may no longer be visible on this site.`
            : `This document will no longer be visible at /${pub.path}`
        }
        cancelButton={
          <Button
            onPress={() => {
              dialogState.onOpenChange(false)
            }}
            chromeless
          >
            Cancel
          </Button>
        }
        actionButton={
          <Button
            theme="red"
            onPress={() => {
              unpublish
                .mutateAsync({
                  hostname,
                  documentId: pub.documentId,
                  version: pub.version,
                })
                .then(() => {
                  dialogState.onOpenChange(false)
                })
                .catch((e) => {
                  console.error(e)
                  toast('Error un-publishing document', {})
                })
            }}
          >
            Delete
          </Button>
        }
      />
    ),
  }
  // const content = (
  //   // <Alert.Root {...dialogState}>
  //   //   <Alert.Portal>
  //   //     <Alert.Overlay className={overlayStyles()} />
  //   //     <Alert.Content>
  //   //       <Alert.Title color="danger">Un-Publish from Site</Alert.Title>
  //   //       <Alert.Description>
  //   //         {pub.path == null
  //   //           ? `This document may no longer be visible on this site.`
  //   //           : `This document will no longer be visible at /${pub.path}`}
  //   //       </Alert.Description>
  //   //       <Alert.Actions>
  //   //         <Alert.Cancel>Cancel</Alert.Cancel>
  //   //         <Alert.Action
  //   //           color="danger"
  //   //           disabled={unpublish.isLoading}
  //   //           onClick={(e: MouseEvent<HTMLButtonElement>) => {
  //   //             e.stopPropagation()
  //   //             e.preventDefault()
  //   //             unpublish
  //   //               .mutateAsync({
  //   //                 hostname,
  //   //                 documentId: pub.documentId,
  //   //                 version: pub.version,
  //   //               })
  //   //               .then(() => {
  //   //                 setIsOpen(false)
  //   //               })
  //   //               .catch((e) => {
  //   //                 console.error(e)
  //   //                 toast('Error un-publishing document', {})
  //   //               })
  //   //           }}
  //   //         >
  //   //           Remove Publication
  //   //         </Alert.Action>
  //   //       </Alert.Actions>
  //   //     </Alert.Content>
  //   //   </Alert.Portal>
  //   // </Alert.Root>
  // )
  // return [
  //   content,
  //   () => {
  //     setIsOpen(true)
  //   },
  // ] as const
}
