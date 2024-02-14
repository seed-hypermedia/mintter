import {useNavRoute} from '@mintter/app/utils/navigation'
import {
  API_FILE_URL,
  PublicationContentContextValue,
  PublicationContentProvider,
  contentLayoutUnit,
  contentTextUnit,
} from '@mintter/shared'
import 'allotment/dist/style.css'
import {useAppContext} from '../app-context'
import {
  EmbedAccount,
  EmbedComment,
  EmbedGroup,
  EmbedPublicationCard,
  EmbedPublicationContent,
} from '../components/app-embeds'
import {useFullReferenceUrl} from '../components/titlebar-common'
import {useExperiments} from '../models/experiments'
import {useOpenUrl} from '../open-url'

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
        }}
        onLinkClick={(href, e) => {
          e.preventDefault()
          e.stopPropagation()
          openUrl(href, e.metaKey)
        }}
        onCopyBlock={
          reference
            ? (blockId: string) => {
                if (blockId && reference) {
                  reference.onCopy(blockId)
                }
              }
            : null
        }
        ipfsBlobPrefix={`${API_FILE_URL}/`}
        saveCidAsFile={saveCidAsFile}
        {...overrides}
      >
        {children}
      </PublicationContentProvider>
      {reference?.content}
    </>
  )
}
