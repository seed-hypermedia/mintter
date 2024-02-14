import { useNavRoute } from '@mintter/app/utils/navigation'
import {
  API_FILE_URL,
  BlockRange,
  ExpandedBlockRange,
  PublicationContentContextValue,
  PublicationContentProvider,
  contentLayoutUnit,
  contentTextUnit,
} from '@mintter/shared'
import 'allotment/dist/style.css'
import { useAppContext } from '../app-context'
import {
  AppInlineEmbed,
  EmbedAccount,
  EmbedComment,
  EmbedGroup,
  EmbedPublicationCard,
  EmbedPublicationContent,
} from '../components/app-embeds'
import { useFullReferenceUrl } from '../components/titlebar-common'
import { useExperiments } from '../models/experiments'
import { useOpenUrl } from '../open-url'

export function AppPublicationContentProvider({
  children,
  ...overrides
}: React.PropsWithChildren<Partial<PublicationContentContextValue>>) {
  const {saveCidAsFile} = useAppContext()
  const openUrl = useOpenUrl()
  const route = useNavRoute()
  const reference = useFullReferenceUrl(route)
  const experiments = useExperiments()
  return (
    <>
      <PublicationContentProvider
        showDevMenu={experiments.data?.pubContentDevMenu}
        layoutUnit={contentLayoutUnit}
        textUnit={contentTextUnit}
        debug={false}
        entityComponents={{
          AccountCard: EmbedAccount,
          GroupCard: EmbedGroup,
          PublicationCard: EmbedPublicationCard,
          PublicationContent: EmbedPublicationContent,
          CommentCard: EmbedComment,
          InlineEmbed: AppInlineEmbed,
        }}
        onLinkClick={(href, e) => {
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
                  reference.onCopy(blockId, blockRange)
                }
              }
            : null
        }
        ipfsBlobPrefix={`${API_FILE_URL}/`}
        saveCidAsFile={saveCidAsFile}
        routeParams={
          route.key == 'publication'
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
