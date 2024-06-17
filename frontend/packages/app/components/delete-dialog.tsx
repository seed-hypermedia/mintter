import {zodResolver} from '@hookform/resolvers/zod'
import {HYPERMEDIA_ENTITY_TYPES, unpackHmId} from '@shm/shared'
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
} from '@shm/ui'
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
  input: {id, title, onSuccess},
  onClose,
}: {
  input: {id: string; title?: string; onSuccess?: () => void}
  onClose?: () => void
}) {
  const deleteEntity = useDeleteEntity({
    onSuccess: () => {
      onClose?.(), onSuccess?.()
    },
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
  const hid = unpackHmId(id)
  const onSubmit: SubmitHandler<DeleteFormFields> = (data) => {
    console.log('DeleteEntityDialog.onSubmit', {id, data})
    deleteEntity.mutate({
      id,
      reason: data.description,
    })
  }
  useEffect(() => {
    setFocus('description')
  }, [setFocus])
  if (!hid) throw new Error('Invalid id passed to DeleteEntityDialog')
  return (
    <YStack space backgroundColor="$background" padding="$4" borderRadius="$3">
      <AlertDialog.Title>
        Delete this {HYPERMEDIA_ENTITY_TYPES[hid.type]}
      </AlertDialog.Title>
      <AlertDialog.Description>
        Are you sure you want to delete this from your computer? It will also be
        blocked to prevent you seeing it again.
      </AlertDialog.Description>
      <AlertDialog.Description>
        You may describe your reason for deleting+blocking this{' '}
        {HYPERMEDIA_ENTITY_TYPES[hid.type].toLocaleLowerCase()} below.
      </AlertDialog.Description>
      <Form onSubmit={handleSubmit(onSubmit)} gap="$4">
        <FormField name="description" errors={errors}>
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
            <Button theme="red">
              {`Delete + Block ${HYPERMEDIA_ENTITY_TYPES[hid.type]}`}
            </Button>
          </Form.Trigger>
        </XStack>
      </Form>
    </YStack>
  )
}
