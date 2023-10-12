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

export function HyperMediaEditorView({editor}: {editor: HyperDocsEditor}) {
  const openUrl = useOpenUrl()
  if (editor.isEditable) {
    return (
      <BlockNoteView editor={editor}>
        <FormattingToolbarPositioner editor={editor} />
        <HyperlinkToolbarPositioner editor={editor} openUrl={openUrl} />
        <SlashMenuPositioner editor={editor} />
        <SideMenuPositioner editor={editor} placement="left" />
      </BlockNoteView>
    )
  } else {
    return (
      <BlockNoteView editor={editor}>
        {/* This is needed so no elements will be rendered for non-editable publications */}
        <YStack opacity={0} pointerEvents="none" />
      </BlockNoteView>
    )
  }
}

export function HMEditorContainer({children}: {children: React.ReactNode}) {
  return <YStack className="editor">{children}</YStack>
}
