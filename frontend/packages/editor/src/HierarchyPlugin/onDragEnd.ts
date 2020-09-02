import {Editor, Transforms} from 'slate'
import {ELEMENT_BLOCK} from '../elements'

export const onDragEnd = editor => result => {
  console.log('result', result)

  if (!result.destination) {
    console.log('no hay destination?????')
    return
  }

  const {destination, draggableId} = result

  const [destinationEntry] = Array.from(
    Editor.nodes(editor, {
      match: n => n.id === destination.droppableId,
    }),
  )

  if (destinationEntry) {
    const [, destinationPath] = destinationEntry

    const [entry] = Array.from(
      Editor.nodes(editor, {
        match: n => n.type === ELEMENT_BLOCK && n.id === draggableId,
      }),
    )

    if (entry) {
      console.log('entry', entry)

      if (entry.length) {
        const [, draggedPath] = entry

        Transforms.moveNodes(editor, {
          at: draggedPath,
          to: destinationPath.concat(destination.index),
        })
      }
    }
  }
}
