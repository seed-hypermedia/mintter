import {BlockNoteView} from '@blocknote/react'
import '@blocknote/core/style.css'
import {HyperDocsEditor} from '@app/models/documents'
import {Container, YStack} from '@mintter/ui'

export function HyperDocsEditorView({editor}: {editor: HyperDocsEditor}) {
  return <BlockNoteView editor={editor} />
}

export function HDEditorContainer({children}: {children: React.ReactNode}) {
  return (
    <Container>
      <YStack>{children}</YStack>{' '}
    </Container>
  )
}
