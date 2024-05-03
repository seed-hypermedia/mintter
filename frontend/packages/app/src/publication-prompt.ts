type PublicationPrompt = {
  key: 'select-location' | 'publish-to-group'
}

let documentId: string | null = null
let prompt: PublicationPrompt | null = null

// this needs to be called before I navigate to the new publication
export function configurePrompt(input: {
  documentId: string
  prompt: PublicationPrompt
}) {
  documentId = input.documentId
  prompt = input.prompt
}

// call this when enter in the publication route to check if I should show a prompt
export function consumePublicationPrompt(docId: string) {
  if (docId === documentId) {
    const thePrompt = prompt
    return thePrompt
  }
  clear()
  return null
}

export function clear() {
  prompt = null
  documentId = null
}
