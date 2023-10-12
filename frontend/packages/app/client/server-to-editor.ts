import {PartialBlock, hmBlockSchema} from '@mintter/editor'
import {
  BlockNode,
  EditorChildrenType,
  ServerToEditorRecursiveOpts,
} from '@mintter/shared'
import {
  serverBlockNodeToEditorParagraph as _serverBlockNodeToEditorParagraph,
  serverBlockToHeading as _serverBlockToHeading,
  serverChildrenToEditorChildren as _serverChildrenToEditorChildren,
} from '@mintter/shared'

export function serverBlockNodeToEditorParagraph(
  serverBlock: BlockNode,
  opts: ServerToEditorRecursiveOpts,
): PartialBlock<typeof hmBlockSchema> {
  return _serverBlockNodeToEditorParagraph(serverBlock, opts)
}

export function serverBlockToHeading(
  serverBlock: BlockNode,
  opts?: ServerToEditorRecursiveOpts,
): PartialBlock<typeof hmBlockSchema> {
  return _serverBlockToHeading(serverBlock, opts)
}

export function serverChildrenToEditorChildren(
  children: BlockNode[],
  opts?: ServerToEditorRecursiveOpts & {
    childrenType?: EditorChildrenType
  },
): PartialBlock<typeof hmBlockSchema>[] {
  return _serverChildrenToEditorChildren(children, opts)
}
