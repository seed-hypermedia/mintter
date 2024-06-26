import { useAppContext } from '@/app-context'
import {
  EmbedAccount,
  EmbedComment,
  EmbedDocument,
  EmbedInline,
} from '@/components/app-embeds'
import { useExperiments } from '@/models/experiments'
import { useOpenUrl } from '@/open-url'
import { trpc } from '@/trpc'
import { useNavRoute } from '@/utils/navigation'
import {
  API_FILE_URL,
  BlockRange,
  DocContentContextValue,
  DocContentProvider,
  ExpandedBlockRange,
  contentLayoutUnit,
  contentTextUnit,
} from '@shm/shared'
import 'allotment/dist/style.css'
import { useFullReferenceUrl } from '../components/titlebar-common'

export function AppDocContentProvider({
  children,
  ...overrides
}: React.PropsWithChildren<Partial<DocContentContextValue>>) {
  const { saveCidAsFile } = useAppContext()
  const openUrl = useOpenUrl()
  const route = useNavRoute()
  const reference = useFullReferenceUrl(route)
  const experiments = useExperiments()
  const importWebFile = trpc.webImporting.importWebFile.useMutation()
  return (
    <>
      <DocContentProvider
        showDevMenu={experiments.data?.pubContentDevMenu}
        layoutUnit={contentLayoutUnit}
        importWebFile={importWebFile}
        textUnit={contentTextUnit}
        debug={false}
        entityComponents={{
          Account: EmbedAccount,
          Document: EmbedDocument,
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
      </DocContentProvider>
      {reference?.content}
    </>
  )
}
