import {useDrag} from '@app/drag-context'
import {dragMachine} from '@app/drag-machine'
import {useMouse} from '@app/mouse-context'
import {FlowContent} from '@mintter/shared'
import React from 'react'
import {Editor, Transforms, Element as SlateElement, Node} from 'slate'
import {ReactEditor, RenderElementProps, useSlate} from 'slate-react'
import {BlockTools} from './blocktools'
import {useBlockProps} from './editor-node-props'
import {useBlockFlash} from './utils'

export type DndState = {fromPath: number[] | null; toPath: number[] | null}

const ElementDrag = ({children, element, attributes}: RenderElementProps) => {
  let dragService = useDrag()
  let mouseService = useMouse()

  const onDrop = (e: React.DragEvent<HTMLLIElement>) => {
    e.preventDefault()
    console.log('ONDROP DRAGGING', e)
    mouseService.send('DISABLE.DRAG.END')
    dragService?.send({
      type: 'DROPPED',
    })

    e.dataTransfer?.clearData()
  }

  // const onDragOver = (e: React.DragEvent<HTMLLIElement>) => {
  //   // e.preventDefault()
  //   const domNode = ReactEditor.toDOMNode(editor, element)
  //   // console.log(domNode);
  //   // const target = ReactEditor.toSlateNode(editor, e.target);
  //   // let targetPath = ReactEditor.findPath(editor, target);
  //   // console.log(Node.parent(target, targetPath))
  //   // if (targetPath.length > 2) {
  //   //   console.log(targetPath);
  //   //   targetPath = targetPath.slice(0, 2);
  //   //   console.log(targetPath);
  //   // }
  //   // console.log(ReactEditor.findPath(editor, target));
  //   dragService?.send({
  //     type: 'DRAG.OVER',
  //     toPath: ReactEditor.findPath(editor, element),
  //     // toPath: ReactEditor.findPath(editor, target),
  //     element: domNode as HTMLLIElement,
  //     // element: e.target as HTMLLIElement,
  //   })
  // }

  let {blockProps} = useBlockProps(element)

  let inRoute = useBlockFlash(attributes.ref, element.id)

  return (
    <li
      {...attributes}
      {...blockProps}
      className={inRoute ? 'flash' : undefined}
      onDrop={onDrop}
      // onDragEnter={onDragOver}
    >
      <BlockTools block={element as FlowContent} />
      {children}
    </li>
  )
}

export {ElementDrag}
