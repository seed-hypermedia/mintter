import {HyperDocsEditor} from '@mintter/app/models/documents'
import {YStack} from '@mintter/ui'
import {
  BlockNoteView,
  FormattingToolbarPositioner,
  HyperlinkToolbarPositioner,
  SideMenuPositioner,
  SlashMenuPositioner,
} from './blocknote'
import './blocknote/core/style.css'
import './editor.css'
import {useOpenUrl} from '@mintter/app/open-url'
import {
  DefaultStaticBlockAccount,
  DefaultStaticBlockGroup,
  DefaultStaticBlockPublication,
  StaticPublicationProvider,
} from '@mintter/shared'

export function HyperMediaEditorView({editor}: {editor: HyperDocsEditor}) {
  const openUrl = useOpenUrl()
  return (
    <BlockNoteView editor={editor}>
      <FormattingToolbarPositioner editor={editor} />
      <HyperlinkToolbarPositioner editor={editor} openUrl={openUrl} />
      <SlashMenuPositioner editor={editor} />
      <SideMenuPositioner editor={editor} placement="left" />
    </BlockNoteView>
  )
}

export function HMEditorContainer({children}: {children: React.ReactNode}) {
  return <YStack className="editor">{children}</YStack>
}
