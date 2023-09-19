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
    <>
      <YStack
        space
        backgroundColor="$background"
        padding="$4"
        borderRadius="$3"
      >
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
    </>
  )
}

export function DeleteDialog({
  trigger,
  cancelButton,
  actionButton,
  actionStackProps,
  titleProps,
  descriptionProps,
  title,
  description,
  contentStackProps,
  dialogContentProps,
  ...dialogProps
}: DeleteDialogProps) {
  return (
    <AlertDialog {...dialogProps}>
      {trigger && (
        <AlertDialog.Trigger asChild>
          {trigger({onPress: () => {}})}
        </AlertDialog.Trigger>
      )}

      <AlertDialog.Portal>
        <AlertDialog.Overlay
          key="overlay"
          animation="quick"
          opacity={0.5}
          // enterStyle={{opacity: 0}}
          // exitStyle={{opacity: 0}}
        />
        <AlertDialog.Content
          elevate
          key="content"
          // animation={[
          //   'quick',
          //   {
          //     opacity: {
          //       overshootClamping: true,
          //     },
          //   },
          // ]}
          // enterStyle={{x: 0, y: -20, opacity: 0, scale: 0.9}}
          // exitStyle={{x: 0, y: 10, opacity: 0, scale: 0.95}}
          // x={0}
          // scale={1}
          // opacity={1}
          // y={0}
          // padding={0}
          {...dialogContentProps}
        >
          <YStack
            space
            backgroundColor="$background"
            padding="$4"
            borderRadius="$3"
            {...contentStackProps}
          >
            <AlertDialog.Title {...titleProps}>{title}</AlertDialog.Title>
            <AlertDialog.Description {...descriptionProps}>
              {description}
            </AlertDialog.Description>

            <XStack space="$3" justifyContent="flex-end" {...actionStackProps}>
              {cancelButton && (
                <AlertDialog.Cancel asChild>{cancelButton}</AlertDialog.Cancel>
              )}
              {actionButton && (
                <AlertDialog.Action asChild>{actionButton}</AlertDialog.Action>
              )}
            </XStack>
          </YStack>
        </AlertDialog.Content>
      </AlertDialog.Portal>
    </AlertDialog>
  )
}
