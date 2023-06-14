import {BlockNoteView} from '@mtt-blocknote/react'
import {HyperDocsEditor} from '@app/models/documents'
import {Container, YStack} from '@mintter/ui'
import '@mtt-blocknote/core/style.css'
import './editor.css'

export function HyperDocsEditorView({editor}: {editor: HyperDocsEditor}) {
  return <BlockNoteView editor={editor} />
}

export function HDEditorContainer({children}: {children: React.ReactNode}) {
  return (
    <Container>
      <YStack>{children}</YStack>
    </Container>
  )
}
