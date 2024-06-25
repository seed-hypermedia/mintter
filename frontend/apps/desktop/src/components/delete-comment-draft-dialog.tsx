import {AlertDialog, Button, XStack, YStack} from '@shm/ui'
import {useAppDialog} from './dialog'

export function useDeleteCommentDraftDialog() {
  return useAppDialog(DeleteCommentDraftDialog, {isAlert: true})
}

function DeleteCommentDraftDialog({
  onClose,
  input,
}: {
  onClose: () => void
  input: {onConfirm: () => void}
}) {
  return (
    <YStack space backgroundColor="$background" padding="$4" borderRadius="$3">
      <AlertDialog.Title>Discard Comment</AlertDialog.Title>
      <AlertDialog.Description>
        Permanently delete this draft comment?
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
            theme="red"
            onPress={() => {
              input.onConfirm()
              onClose()
            }}
          >
            Delete
          </Button>
        </AlertDialog.Action>
      </XStack>
    </YStack>
  )
}
