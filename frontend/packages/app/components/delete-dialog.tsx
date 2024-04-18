import {zodResolver} from '@hookform/resolvers/zod'
import {
  AlertDialog,
  AlertDialogContentProps,
  AlertDialogProps,
  Button,
  Form,
  HeadingProps,
  ParagraphProps,
  XStack,
  XStackProps,
  YStack,
} from '@mintter/ui'
import {ReactNode, useEffect} from 'react'
import {SubmitHandler, useForm} from 'react-hook-form'
import {z} from 'zod'
import {useDeleteEntity} from '../models/entities'
import {useAppDialog} from './dialog'
import {FormTextArea} from './form-input'
import {FormField} from './forms'

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

const deleteFormSchema = z.object({
  description: z.string(),
})
type DeleteFormFields = z.infer<typeof deleteFormSchema>

export function useDeleteDialog() {
  return useAppDialog(DeleteEntityDialog, {isAlert: true})
}

export function DeleteEntityDialog({
  input: {id, title},
  onClose,
}: {
  input: {id: string; title?: string}
  onClose?: () => void
}) {
  const deleteEntity = useDeleteEntity({
    onSuccess: onClose,
  })
  const {
    control,
    handleSubmit,
    setFocus,
    formState: {errors},
  } = useForm<DeleteFormFields>({
    resolver: zodResolver(deleteFormSchema),
    defaultValues: {
      description: title
        ? `Deleted "${title}" because...`
        : 'Deleted because...',
    },
  })
  const onSubmit: SubmitHandler<DeleteFormFields> = (data) => {
    deleteEntity.mutate({
      id,
      reason: data.description,
    })
  }
  useEffect(() => {
    setFocus('description')
  }, [setFocus])
  return (
    <YStack space backgroundColor="$background" padding="$4" borderRadius="$3">
      <AlertDialog.Title>Delete document</AlertDialog.Title>
      <AlertDialog.Description>
        Are you sure you want to delete this? You may describe why this should
        be removed, so you can remember why you did this.
      </AlertDialog.Description>
      <Form onSubmit={handleSubmit(onSubmit)}>
        <FormField
          name="description"
          label="Reason for Deleting"
          errors={errors}
        >
          <FormTextArea
            control={control}
            name="description"
            placeholder="Reason for deleting..."
          />
        </FormField>
        <XStack space="$3" justifyContent="flex-end">
          <AlertDialog.Cancel asChild>
            <Button onPress={onClose} chromeless>
              Cancel
            </Button>
          </AlertDialog.Cancel>
          <Form.Trigger asChild>
            <Button theme="red">Delete</Button>
          </Form.Trigger>
        </XStack>
      </Form>
    </YStack>
  )
}
