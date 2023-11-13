import {BlockNoteEditor} from '../../BlockNoteEditor'
import {BlockSchema} from '../Blocks/api/blockTypes'
import {DefaultBlockSchema} from '../Blocks/api/defaultBlocks'

export type LinkMenuItem<BSchema extends BlockSchema = DefaultBlockSchema> = {
  name: string
  execute: (editor: BlockNoteEditor<BSchema>, ref: string) => void
}
