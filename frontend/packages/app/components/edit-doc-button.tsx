import {useGRPCClient} from '@mintter/app/app-context'
import {useDraftList} from '@mintter/app/models/documents'
import {usePublicationVariant} from '@mintter/app/models/publication'
import {NavMode} from '@mintter/app/utils/navigation'
import {useNavigate} from '@mintter/app/utils/useNavigate'
import {GroupVariant, HMBlock, PublicationVariant} from '@mintter/shared'
import {Button, Tooltip, toast} from '@mintter/ui'
import {Pencil} from '@tamagui/lucide-icons'
import {useQueryInvalidator} from '../app-context'
import appError from '../errors'
import {useMyAccount} from '../models/accounts'
import {queryKeys} from '../models/query-keys'
import {generateBlockId} from '../utils/media-drag'
import {
  AccountRoute,
  DocumentsRoute,
  GroupRoute,
  PublicationRoute,
} from '../utils/routes'

export function useEditDraft(
  docId: string | undefined,
  {
    version,
    navMode,
    contextRoute,
    variants,
    isProfileDocument,
  }: {
    version: string | undefined
    navMode?: NavMode
    contextRoute: PublicationRoute | DocumentsRoute | GroupRoute | AccountRoute
    variants?: PublicationVariant[]
    isProfileDocument?: boolean
  },
) {
  const draftList = useDraftList()
  const myAccount = useMyAccount()
  const navigate = useNavigate(navMode)
  const invalidate = useQueryInvalidator()

  const hasExistingDraft =
    !!docId && draftList.data?.documents.some((draft) => draft.id == docId)
  const grpcClient = useGRPCClient()

  async function handleEdit() {
    const groupVariants = variants?.filter((v) => v.key === 'group') as
      | GroupVariant[]
      | undefined
    const singleGroupVariant =
      (groupVariants && groupVariants.length === 1
        ? groupVariants[0]
        : undefined) || null
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
        variant: singleGroupVariant,
        isProfileDocument,
      })
      invalidate([queryKeys.GET_DRAFT_LIST])
      invalidate([queryKeys.GET_PUBLICATION_DRAFTS, draft.id])
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
  navMode = 'push',
  variants,
  baseVersion,
  isProfileDocument,
}: {
  docId: string | undefined
  navMode?: NavMode
  contextRoute: PublicationRoute | DocumentsRoute | GroupRoute | AccountRoute
  variants?: PublicationVariant[]
  baseVersion?: string
  isProfileDocument?: boolean
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
