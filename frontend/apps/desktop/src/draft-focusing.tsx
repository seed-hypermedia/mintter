let draftId: string | null = null
let handlers = new Set<(blockId: string) => void>()

export function subscribeDraftFocus(
  docId: string,
  handler: (blockId: string) => void,
): () => void {
  if (docId !== draftId) {
    draftId = docId
    handlers.clear()
  }
  handlers.add(handler)
  return () => {
    handlers.delete(handler)
  }
}

export function focusDraftBlock(docId: string, blockId: string) {
  if (docId !== draftId) return
  handlers.forEach((handler) => handler(blockId))
}
