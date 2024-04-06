import {getDocumentTitle} from '@mintter/shared'
import {FileText, YGroup, YStack} from '@mintter/ui'
import {ReactNode} from 'react'
import {usePublicationEmbeds} from '../models/documents'
import {usePublicationVariant} from '../models/publication'
import {useNavRoute} from '../utils/navigation'
import {useNavigate} from '../utils/useNavigate'
import {
  DocumentFocusSidebar,
  GenericSidebarContainer,
  SidebarItem,
  activeDocOutline,
  getDocOutline,
} from './sidebar-base'

export function DocumentSidebar({
  focus,
  sidebarHeader,
}: {
  focus: DocumentFocusSidebar
  sidebarHeader: ReactNode
}) {
  const route = useNavRoute()
  const replace = useNavigate('replace')
  const navigate = useNavigate()
  const publicationRoute = route.key === 'publication' ? route : null
  const doc = usePublicationVariant({
    documentId: focus.documentId,
    versionId: focus.version,
    variants: focus.variants,
  })
  const pubEmbeds = usePublicationEmbeds(doc.data?.publication, !!doc.data, {
    skipCards: true,
  })
  const activeBlock = publicationRoute?.blockId
  const docOutline = getDocOutline(
    doc?.data?.publication?.document?.children || [],
    pubEmbeds,
  )
  const {outlineContent, isBlockActive} = activeDocOutline(
    docOutline,
    activeBlock,
    pubEmbeds,
    (blockId) => {
      const publicationRoute = route.key == 'publication' ? route : null
      if (!publicationRoute) {
        // navigate({
        //   key: 'publication',
        //   accountId,
        //   blockId,
        // })
      } else {
        replace({
          ...publicationRoute,
          blockId,
        })
      }
    },
    navigate,
  )
  return (
    <GenericSidebarContainer>
      <YStack>{sidebarHeader}</YStack>
      <SidebarItem
        minHeight={50}
        paddingVertical="$2"
        title={getDocumentTitle(doc.data?.publication?.document)}
        onPress={() => {}}
        active={!isBlockActive}
        icon={FileText}
      />
      <YGroup>{outlineContent}</YGroup>
    </GenericSidebarContainer>
  )
}
