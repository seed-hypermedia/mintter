import {HyperDocsEditor} from '@mintter/app/models/documents'
import {useOpenUrl} from '@mintter/app/open-url'
import {YStack} from '@mintter/ui'
import {
  BlockNoteView,
  FormattingToolbarPositioner,
  HyperlinkToolbarPositioner,
  LinkMenuPositioner,
  SideMenuPositioner,
  SlashMenuPositioner,
} from './blocknote'
import './blocknote/core/style.css'
import './editor.css'

export function HyperMediaEditorView({
  editor,
  editable = true,
}: {
  editor: HyperDocsEditor
  editable: boolean
}) {
  const openUrl = useOpenUrl()
  return (
    <BlockNoteView editor={editor}>
      <FormattingToolbarPositioner editor={editor} />
      <HyperlinkToolbarPositioner editor={editor} openUrl={openUrl} />
      <SlashMenuPositioner editor={editor} />
      <SideMenuPositioner editor={editor} placement="left" />
      <LinkMenuPositioner editor={editor} />
    </BlockNoteView>
  )
}

export function HMEditorContainer({children}: {children: React.ReactNode}) {
  return <YStack className="editor">{children}</YStack>
}
