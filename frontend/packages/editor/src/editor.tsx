import {HyperDocsEditor} from '@mintter/app/src/models/documents'
import {YStack} from '@mintter/ui'
import {
  BlockNoteView,
  FormattingToolbarPositioner,
  HyperlinkToolbarPositioner,
  SideMenuPositioner,
} from './blocknote'
import './blocknote/core/style.css'
import './editor.css'

export function HyperMediaEditorView({editor}: {editor: HyperDocsEditor}) {
  if (editor.isEditable) {
    return (
      <BlockNoteView editor={editor}>
        <FormattingToolbarPositioner editor={editor} />
        <HyperlinkToolbarPositioner editor={editor} />
        {/* <SlashMenuPositioner editor={editor} /> */}
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
