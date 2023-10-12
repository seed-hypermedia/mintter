import {
  AlertDialog,
  AlertDialogContentProps,
  AlertDialogProps,
  Button,
  HeadingProps,
  ParagraphProps,
  XStack,
  XStackProps,
  YStack,
} from '@mintter/ui'
import {ReactNode} from 'react'
import {useDeletePublication} from '../models/documents'

export type DeleteDialogProps = AlertDialogProps & {
  dialogContentProps?: AlertDialogContentProps
  trigger?: (props: {onPress: () => void}) => JSX.Element
  cancelButton?: ReactNode
  actionButton?: ReactNode
  contentStackProps?: XStackProps
  actionStackProps?: XStackProps
  title: string
  titleProps?: HeadingProps
  description: string
  descriptionProps?: ParagraphProps
}

export function DeleteDocumentDialog({
  input: docId,
  onClose,
}: {
  input: string
  onClose?: () => void
}) {
  const deletePub = useDeletePublication({
    onSuccess: onClose,
  })
  return (
    <YStack space backgroundColor="$background" padding="$4" borderRadius="$3">
      <AlertDialog.Title>Delete document</AlertDialog.Title>
      <AlertDialog.Description>
        Are you sure you want to delete this document? This action is not
        reversible.
      </AlertDialog.Description>

      <XStack space="$3" justifyContent="flex-end">
        <AlertDialog.Cancel asChild>
          <Button onPress={onClose} chromeless>
            Cancel
          </Button>
        </AlertDialog.Cancel>
        <AlertDialog.Action asChild>
          <Button
            theme="red"
            onPress={() => {
              deletePub.mutate(docId)
            }}
          >
            Delete
          </Button>
        </AlertDialog.Action>
      </XStack>
    </YStack>
  )
}
