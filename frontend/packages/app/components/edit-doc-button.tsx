import {useGRPCClient} from '@mintter/app/app-context'
import {useDraftList} from '@mintter/app/models/documents'
import {usePublicationVariant} from '@mintter/app/models/publication'
import {NavMode} from '@mintter/app/utils/navigation'
import {useNavigate} from '@mintter/app/utils/useNavigate'
import {GroupVariant, PublicationVariant} from '@mintter/shared'
import {Button, Tooltip, toast} from '@mintter/ui'
import {Pencil} from '@tamagui/lucide-icons'
import appError from '../errors'
import {NavRoute} from '../utils/routes'

export function useEditDraft(
  docId: string,
  {
    version,
    navMode,
    contextRoute,
    variants,
  }: {
    version: string | undefined
    navMode?: NavMode
    contextRoute: NavRoute
    variants?: PublicationVariant[]
  },
) {
  const draftList = useDraftList()
  const navigate = useNavigate(navMode)

  const hasExistingDraft = draftList.data?.documents.some(
    (draft) => draft.id == docId,
  )
  const grpcClient = useGRPCClient()

  async function handleEdit() {
    const groupVariants = variants?.filter((v) => v.key === 'group') as
      | GroupVariant[]
      | undefined
    const singleGroupVariant =
      groupVariants && groupVariants.length === 0 ? groupVariants[0] : undefined
    try {
      if (hasExistingDraft) {
        // todo, careful! this only works because draftId is docId right now
        navigate({
          key: 'draft',
          draftId: docId,
          contextRoute,
          variant: singleGroupVariant,
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
        variant: singleGroupVariant,
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
          variant: singleGroupVariant,
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
  variants,
  baseVersion,
}: {
  docId: string
  navMode?: NavMode
  contextRoute: NavRoute
  variants?: PublicationVariant[]
  baseVersion?: string
}) {
  const pub = usePublicationVariant({
    documentId: docId,
    versionId: baseVersion,
    variants,
    enabled: !!docId,
  })
  const pubVersion = pub.data?.publication?.version
  const {hasExistingDraft, handleEdit} = useEditDraft(docId, {
    version: baseVersion || pubVersion,
    variants,
    navMode,
    contextRoute,
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
