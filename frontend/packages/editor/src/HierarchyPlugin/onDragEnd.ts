import {Editor, Transforms} from 'slate'
import {ELEMENT_BLOCK} from '../elements'

export const onDragEnd = editor => result => {
  console.log('result', result)

  if (!result.destination) {
    console.log('no hay destination?????')
    return
  }

  const {destination, draggableId} = result

  // const [sourceNode, sourcePath] = Array.from(
  //   Editor.nodes(editor, {
  //     match: n => n.id === source.droppableId,
  //   }),
  // )[0]

  const [, destinationPath] = Array.from(
    Editor.nodes(editor, {
      match: n => n.id === destination.droppableId,
    }),
  )[0]

  const entry = Array.from(
    Editor.nodes(editor, {
      match: n => n.type === ELEMENT_BLOCK && n.id === draggableId,
    }),
  )
  console.log('entry', entry)

  if (entry.length) {
    const [, draggedPath] = entry[0]
    console.log({
      entry,
      draggedPath,
      destinationPath,
      to: destinationPath.concat(destination.index),
    })

    Transforms.moveNodes(editor, {
      at: draggedPath,
      to: destinationPath.concat(destination.index),
    })
  }
}
