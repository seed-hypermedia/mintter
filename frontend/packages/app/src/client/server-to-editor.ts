import {PartialBlock} from '@mintter/app/src/blocknote-core'
import {
  BlockNode,
  EditorChildrenType,
  ServerToEditorRecursiveOpts,
} from '@mintter/shared'
import {hdBlockSchema} from './schema'
import {
  serverBlockNodeToEditorParagraph as _serverBlockNodeToEditorParagraph,
  serverBlockToHeading as _serverBlockToHeading,
  serverChildrenToEditorChildren as _serverChildrenToEditorChildren,
} from '@mintter/shared'

export function serverBlockNodeToEditorParagraph(
  serverBlock: BlockNode,
  opts: ServerToEditorRecursiveOpts,
): PartialBlock<typeof hdBlockSchema> {
  return _serverBlockNodeToEditorParagraph(serverBlock, opts)
}

export function serverBlockToHeading(
  serverBlock: BlockNode,
  opts?: ServerToEditorRecursiveOpts,
): PartialBlock<typeof hdBlockSchema> {
  return _serverBlockToHeading(serverBlock, opts)
}

export function serverChildrenToEditorChildren(
  children: BlockNode[],
  opts?: ServerToEditorRecursiveOpts & {
    childrenType?: EditorChildrenType
  },
): PartialBlock<typeof hdBlockSchema>[] {
  return _serverChildrenToEditorChildren(children, opts)
}
