import {useGRPCClient} from '@mintter/app/app-context'
import {useDraftList} from '@mintter/app/models/documents'
import {usePublicationVariant} from '@mintter/app/models/publication'
import {toast} from '@mintter/app/toast'
import {NavMode, NavRoute} from '@mintter/app/utils/navigation'
import {useNavigate} from '@mintter/app/utils/useNavigate'
import {Button, Tooltip, XGroup} from '@mintter/ui'
import {Pencil} from '@tamagui/lucide-icons'
import appError from '../errors'
import {PublicationVariant} from '../utils/navigation'

export function useEditDraft(
  docId: string,
  {
    version,
    navMode,
    contextRoute,
    variant,
  }: {
    version: string | undefined
    navMode?: NavMode
    contextRoute: NavRoute
    variant?: PublicationVariant
  },
) {
  const draftList = useDraftList()
  const navigate = useNavigate(navMode)

  const hasExistingDraft = draftList.data?.documents.some(
    (draft) => draft.id == docId,
  )
  const grpcClient = useGRPCClient()

  async function handleEdit() {
    try {
      if (hasExistingDraft) {
        // todo, careful! this only works because draftId is docId right now
        navigate({
          key: 'draft',
          draftId: docId,
          contextRoute,
          variant: variant?.key === 'group' ? variant : undefined,
        })
        return
      }
      let draft = await grpcClient.drafts.createDraft({
        existingDocumentId: docId,
        version,
      })
      navigate({
        key: 'draft',
        draftId: draft.id,
        contextRoute,
        variant: variant?.key === 'group' ? variant : undefined,
      })
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
          variant: variant?.key === 'group' ? variant : undefined,
        })
        return
      }

      appError(`Draft Error: ${error?.message}`, {error})
    }
  }
  return {hasExistingDraft, handleEdit}
}

export function EditDocButton({
  docId,
  contextRoute,
  navMode = 'replace',
  variant,
  baseVersion,
}: {
  docId: string
  navMode?: NavMode
  contextRoute: NavRoute
  variant: PublicationVariant
  baseVersion?: string
}) {
  const pub = usePublicationVariant({
    documentId: docId,
    versionId: baseVersion,
    variant,
    enabled: !!docId,
  })
  const pubVersion = pub.data?.publication?.version
  const {hasExistingDraft, handleEdit} = useEditDraft(docId, {
    version: baseVersion || pubVersion,
    variant,
    navMode,
    contextRoute,
  })

  return (
    <>
      <Tooltip content={hasExistingDraft ? 'Resume Editing' : 'Edit Document'}>
        <XGroup.Item>
          <Button
            size="$2"
            theme={hasExistingDraft ? 'yellow' : undefined}
            onPress={() => handleEdit()}
            icon={Pencil}
          >
            {hasExistingDraft ? 'Resume Editing' : 'Edit'}
          </Button>
        </XGroup.Item>
      </Tooltip>
    </>
  )
}
