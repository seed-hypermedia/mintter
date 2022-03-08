import { FlowContent } from "@app/../../mttast/dist";
import { DocumentChange, Span, UpdateDraftRequestV2 } from "@app/client";
import { blockToApi } from "@app/client/v2/block-to-api";
import { changesService } from "@app/editor/mintter-changes/plugin";
import { EditorDocument } from "@app/editor/use-editor-draft";
import { Node, Path } from "slate";

export function createUpdate(newDraft: EditorDocument): UpdateDraftRequestV2 {
  let { upsertBlocks, deleteBlocks } = changesService.getSnapshot().context
  let changes: Array<DocumentChange> = [
    {
      op: {
        $case: 'setTitle',
        setTitle: newDraft.title || ""
      }
    }, {
      op: {
        $case: 'setSubtitle',
        setSubtitle: newDraft.subtitle || ""
      }
    },
    ...createBlockChanges(newDraft, upsertBlocks, deleteBlocks)
  ]
  return {
    documentId: newDraft.id!,
    changes
  }
}

function createBlockChanges(next: EditorDocument, upsertBlocks: { [key: string]: Path | null }, deleteBlocks: Array<string>): Array<DocumentChange> {

  let upsertChanges: Array<DocumentChange> = []

  Object.entries(upsertBlocks).forEach(([node, path]) => {
    if (!path) return
    let root = { children: next.content } as Node
    let currentNode = Node.get(root, path)
    let parent = path.length == 2 ? '' : (Node.parent(root, Path.parent(path)
    ) as FlowContent).id
    let leftSibling = path[path.length - 1] == 0 ? '' : (Node.get(root, Path.previous(path)) as FlowContent).id

    let block = tempBlock(currentNode)

    // temporal transformation

    upsertChanges.push({
      op: {
        $case: 'upsertBlock',
        upsertBlock: {
          block,
          parent,
          leftSibling
        }
      }
    })
  })

  let deleteChanges: Array<DocumentChange> = deleteBlocks.map(id => ({
    op: {
      $case: "deleteBlock",
      deleteBlock: id
    }
  }))

  let result = [...upsertChanges, ...deleteChanges]

  return result
}

function tempBlock(entry: any) {
  let { layers, ...rest } = blockToApi(entry as FlowContent)

  return layers ? {
    ...rest,
    annotations: layers.map(l => ({
      type: l.type,
      start: l.starts[0],
      end: l.ends[0],
      attributes: l.attributes
    } as Span))
  } : rest
}