import {useSiteUnpublish} from '@app/models/sites'
import {usePopoverState} from '@app/use-popover-state'
import {DeleteDialog} from '@app/components/delete-dialog'
import {WebPublicationRecord} from '@mintter/shared'
import {Button} from '@mintter/ui'
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
}
