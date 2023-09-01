import '@mintter/app/src/blocknote-core/style.css'
import { BlockNoteView } from '@mintter/app/src/blocknote-react'
import { HyperDocsEditor } from '@mintter/app/src/models/documents'
import { YStack } from '@mintter/ui'
import './editor.css'

export function HyperMediaEditorView({editor}: {editor: HyperDocsEditor}) {
  return <BlockNoteView editor={editor} />
}

export function HDEditorContainer({children}: {children: React.ReactNode}) {
  return <YStack className="editor">{children}</YStack>
}
