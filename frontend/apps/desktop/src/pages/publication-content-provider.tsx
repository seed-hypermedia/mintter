import { useAppContext } from '@shm/desktop/src/app-context'
import {
  EmbedAccount,
  EmbedComment,
  EmbedInline,
  EmbedPublication,
} from '@shm/desktop/src/components/app-embeds'
import { useExperiments } from '@shm/desktop/src/models/experiments'
import { useOpenUrl } from '@shm/desktop/src/open-url'
import { trpc } from '@shm/desktop/src/trpc'
import { useNavRoute } from '@shm/desktop/src/utils/navigation'
import {
  API_FILE_URL,
  BlockRange,
  ExpandedBlockRange,
  PublicationContentContextValue,
  PublicationContentProvider,
  contentLayoutUnit,
  contentTextUnit,
} from '@shm/shared'
import 'allotment/dist/style.css'
import { useFullReferenceUrl } from '../components/titlebar-common'

export function AppPublicationContentProvider({
  children,
  ...overrides
}: React.PropsWithChildren<Partial<PublicationContentContextValue>>) {
  const { saveCidAsFile } = useAppContext()
  const openUrl = useOpenUrl()
  const route = useNavRoute()
  const reference = useFullReferenceUrl(route)
  const experiments = useExperiments()
  const importWebFile = trpc.webImporting.importWebFile.useMutation()
  return (
    <>
      <PublicationContentProvider
        showDevMenu={experiments.data?.pubContentDevMenu}
        layoutUnit={contentLayoutUnit}
        importWebFile={importWebFile}
        textUnit={contentTextUnit}
        debug={false}
        entityComponents={{
          Account: EmbedAccount,
          Publication: EmbedPublication,
          Comment: EmbedComment,
          Inline: EmbedInline,
        }}
        onLinkClick={(href, e) => {
          debugger
          e.preventDefault()
          e.stopPropagation()
          openUrl(href, e.metaKey)
        }}
        onCopyBlock={
          reference
            ? (
              blockId: string,
              blockRange: BlockRange | ExpandedBlockRange | undefined,
            ) => {
              if (blockId && reference) {
                reference.onCopy(blockId, blockRange || { expanded: true })
              }
            }
            : null
        }
        ipfsBlobPrefix={`${API_FILE_URL}/`}
        saveCidAsFile={saveCidAsFile}
        routeParams={
          route.key == 'document'
            ? {
              documentId: route.documentId,
              version: route.versionId,
              blockRef: route.blockId,
            }
            : {}
        }
        {...overrides}
      >
        {children}
      </PublicationContentProvider>
      {reference?.content}
    </>
  )
}
