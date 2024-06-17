import {AlertDialog, Button, XStack, YStack, toast} from '@shm/ui'
import {useAppDialog} from './dialog'

export function useMediaDialog() {
  return useAppDialog(MediaDialog, {isAlert: true})
}

function MediaDialog({
  onClose,
  input,
}: {
  onClose: () => void
  input: {draftId: string | undefined; publish: any}
}) {
  return (
    <YStack space backgroundColor="$background" padding="$4" borderRadius="$3">
      <AlertDialog.Title>Commit Document</AlertDialog.Title>
      <AlertDialog.Description>
        All empty media elements will be deleted in your publication. Do you
        wish to proceed?
      </AlertDialog.Description>

      <XStack space="$3" justifyContent="flex-end">
        <AlertDialog.Cancel asChild>
          <Button
            onPress={() => {
              onClose()
            }}
            chromeless
          >
            Cancel
          </Button>
        </AlertDialog.Cancel>
        <AlertDialog.Action asChild>
          <Button
            theme="green"
            onPress={() => {
              if (input.draftId) {
                try {
                  input.publish.mutate({draftId: input.draftId})
                } catch (e: any) {
                  toast.error('Failed to publish: ' + e)
                }
              }
              onClose()
            }}
          >
            Commit
          </Button>
        </AlertDialog.Action>
      </XStack>
    </YStack>
  )
}
