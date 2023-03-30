import {useDeleteDraft} from '@app/hooks'
import {ReactNode, useState} from 'react'
import {Alert} from './alert'
import {overlayStyles} from './dialog-styles'

export function useDeleteDraftDialog(
  docId: string | null,
  renderTrigger: (props: {onClick: () => void}) => JSX.Element,
  onSuccess?: () => void,
): ReactNode {
  const [isOpen, setIsOpen] = useState(false)
  const deleteDraft = useDeleteDraft({
    onSuccess: () => {
      setIsOpen(false)
      onSuccess?.()
    },
  })
  if (!docId) return null
  return (
    <Alert.Root open={isOpen} onOpenChange={setIsOpen}>
      <Alert.Trigger asChild>
        {renderTrigger({onClick: () => {}})}
      </Alert.Trigger>
      <Alert.Portal>
        <Alert.Overlay className={overlayStyles()} />
        <Alert.Content>
          <Alert.Title color="danger" data-testid="delete-draft-dialog-title">
            Discard Draft
          </Alert.Title>
          <Alert.Description>
            Permanently delete this draft document?
          </Alert.Description>
          {deleteDraft.error && (
            <Alert.Description
              data-testid="delete-draft-dialog-error"
              color="danger"
            >
              Something went wrong on deletion
            </Alert.Description>
          )}
          <Alert.Actions>
            <Alert.Cancel
              data-testid="delete-draft-dialog-cancel"
              disabled={deleteDraft.isLoading}
            >
              Cancel
            </Alert.Cancel>
            <Alert.Action
              color="danger"
              data-testid="delete-draft-dialog-confirm"
              disabled={deleteDraft.isLoading}
              onClick={(e: React.MouseEvent) => {
                e.stopPropagation()
                e.preventDefault()
                deleteDraft.mutate(docId)
                // DO MUTATE
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
