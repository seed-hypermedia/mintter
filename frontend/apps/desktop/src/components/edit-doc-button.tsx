import { useGRPCClient } from '@shm/desktop/src/app-context'
import { useDocument, useDraftList } from '@shm/desktop/src/models/documents'
import { NavMode } from '@shm/desktop/src/utils/navigation'
import { useNavigate } from '@shm/desktop/src/utils/useNavigate'
import { HMBlock } from '@shm/shared'
import { Button, Tooltip, toast } from '@shm/ui'
import { Pencil } from '@tamagui/lucide-icons'
import { useQueryInvalidator } from '../app-context'
import appError from '../errors'
import { useMyAccount_deprecated } from '../models/accounts'
import { queryKeys } from '../models/query-keys'
import { generateBlockId } from '../utils/media-drag'
import { AccountRoute, DocumentRoute } from '../utils/routes'

export function useEditDraft(
  docId: string | undefined,
  {
    version,
    navMode,
    contextRoute,
    isProfileDocument,
  }: {
    version: string | undefined
    navMode?: NavMode
    contextRoute: DocumentRoute | AccountRoute
    isProfileDocument?: boolean
  },
) {
  const draftList = useDraftList()
  const myAccount = useMyAccount_deprecated()
  const navigate = useNavigate(navMode)
  const invalidate = useQueryInvalidator()

  const hasExistingDraft =
    !!docId && draftList.data?.documents.some((draft) => draft.id == docId)
  const grpcClient = useGRPCClient()

  async function handleEdit() {
    try {
      if (hasExistingDraft) {
        // todo, careful! this only works because draftId is docId right now
        navigate({
          key: 'draft',
          draftId: docId,
          contextRoute,
        })
        return
      }
      let draft = await grpcClient.drafts.createDraft({
        existingDocumentId: docId,
        version,
      })
      if (isProfileDocument && !docId) {
        const newBlock: HMBlock = {
          id: generateBlockId(),
          type: 'paragraph',
          text: myAccount.data?.profile?.bio || '',
          annotations: [],
        }
        await grpcClient.drafts.updateDraft({
          documentId: draft.id,
          changes: [
            {
              op: {
                case: 'setTitle',
                value: myAccount.data?.profile?.alias || '',
              },
            },
            {
              op: {
                case: 'moveBlock',
                value: {
                  blockId: newBlock.id,
                  parent: '',
                  leftSibling: '',
                },
              },
            },
            {
              op: {
                case: 'replaceBlock',
                value: newBlock,
              },
            },
          ],
        })
      }
      navigate({
        key: 'draft',
        draftId: draft.id,
        contextRoute,
        isProfileDocument,
      })
      invalidate([queryKeys.GET_DRAFT_LIST])
      invalidate([queryKeys.DOCUMENT_DRAFTS, draft.id])
    } catch (error: any) {
      if (
        error?.message.match('[failed_precondition]') &&
        error?.message.match('already exists')
      ) {
        toast('A draft already exists for this document. Please review.')
        navigate({
          key: 'draft',
          draftId: docId, // because docId and draftId are the same right now
          contextRoute,
        })
        return
      }

      appError(`Draft Error: ${error?.message}`, { error })
    }
  }
  return { hasExistingDraft, handleEdit }
}

export function EditDocButton({
  docId,
  contextRoute,
  navMode = 'push',
  baseVersion,
  isProfileDocument,
}: {
  docId: string | undefined
  navMode?: NavMode
  contextRoute: DocumentRoute | AccountRoute
  baseVersion?: string
  isProfileDocument?: boolean
}) {
  const doc = useDocument(
    docId,
    baseVersion,
    {
      enabled: !!docId,
    })
  const pubVersion = doc.data?.version
  const { hasExistingDraft, handleEdit } = useEditDraft(docId, {
    version: baseVersion || pubVersion,
    navMode,
    contextRoute,
    isProfileDocument,
  })

  return (
    <>
      <Tooltip content={hasExistingDraft ? 'Resume Editing' : 'Edit Document'}>
        <Button
          size="$2"
          theme={hasExistingDraft ? 'yellow' : undefined}
          onPress={() => handleEdit()}
          icon={Pencil}
        >
          {hasExistingDraft ? 'Resume Editing' : 'Edit'}
        </Button>
      </Tooltip>
    </>
  )
}
