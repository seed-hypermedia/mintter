import '@app/blocknote-core/style.css'
import {BlockNoteView} from '@app/blocknote-react'
import {HyperDocsEditor} from '@app/models/documents'
import {Container, YStack} from '@mintter/ui'
import './editor.css'

export function HyperDocsEditorView({editor}: {editor: HyperDocsEditor}) {
  return <BlockNoteView editor={editor} />
}

export function HDEditorContainer({children}: {children: React.ReactNode}) {
  return (
    <>
      <YStack className="editor">{children}</YStack>
    </>
  )
}
