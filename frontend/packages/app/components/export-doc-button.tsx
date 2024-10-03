import {HMBlockNode, toHMBlock} from '@mintter/shared'
import {Button, Tooltip} from '@mintter/ui'
import {Download} from '@tamagui/lucide-icons'
import {useAppContext} from '../app-context'
import {usePublication} from '../models/documents'
import {convertBlocksToMarkdown} from '../utils/blocks-to-markdown'

export const ExportDocButton = ({
  docId,
  version,
}: {
  docId: string | undefined
  version: string | undefined
}) => {
  const pub = usePublication({id: docId, version: version})
  const title = pub.data?.document?.title || 'document'
  const {exportDocument} = useAppContext()
  return (
    <>
      <Tooltip content={'Export Document to Markdown'}>
        <Button
          size="$2"
          theme="blue"
          onPress={async () => {
            const blocks: HMBlockNode[] | undefined =
              pub.data?.document?.children
            const editorBlocks = toHMBlock(blocks)

            const markdownWithFiles =
              await convertBlocksToMarkdown(editorBlocks)

            const {markdownContent, mediaFiles} = markdownWithFiles
            // Prepend the title as an H1 to the markdown content
            const markdownWithTitle = `# ${title}\n\n${markdownContent}`
            exportDocument(title, markdownWithTitle, mediaFiles)
          }}
          icon={Download}
        >
          Export
        </Button>
      </Tooltip>
    </>
  )
}
