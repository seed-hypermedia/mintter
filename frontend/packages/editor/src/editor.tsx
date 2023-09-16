import './blocknote/core/style.css'
import {
  BlockNoteView,
  FormattingToolbarPositioner,
  HyperlinkToolbarPositioner,
  SideMenu,
  SideMenuPositioner,
  SideMenuProps,
  SlashMenuPositioner,
} from './blocknote'
import {HyperDocsEditor} from '@mintter/app/src/models/documents'
import {YStack} from '@mintter/ui'
import './editor.css'
import {XStack} from 'tamagui'

const CustomSideMenu = (props: SideMenuProps) => (
  <SideMenu>
    <XStack width={40} height={40} backgroundColor="red" />
  </SideMenu>
)

export function HyperMediaEditorView({editor}: {editor: HyperDocsEditor}) {
  if (editor.isEditable) {
    return (
      <BlockNoteView editor={editor}>
        <FormattingToolbarPositioner editor={editor} />
        <HyperlinkToolbarPositioner editor={editor} />
        <SlashMenuPositioner editor={editor} />
        <SideMenuPositioner editor={editor} placement="left" />
      </BlockNoteView>
    )
  } else {
    return (
      <BlockNoteView editor={editor}>
        <SideMenuPositioner
          editor={editor}
          placement="right"
          sideMenu={CustomSideMenu}
        />
      </BlockNoteView>
    )
  }
}

export function HMEditorContainer({children}: {children: React.ReactNode}) {
  return <YStack className="editor">{children}</YStack>
}
