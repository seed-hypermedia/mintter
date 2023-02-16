import { useDrag } from '@app/drag-context';
import { dragMachine } from '@app/drag-machine';
import { useState } from 'react';
import { Editor, Transforms, Element as SlateElement } from 'slate';
import { ReactEditor, useSlate } from 'slate-react';
import { BlockTools } from './blocktools';
import { useBlockProps } from './editor-node-props';
import { useBlockFlash } from './utils';

export type DndState = { fromPath: number[] | null; toPath: number[] | null };

const ElementDrag = ({
    children,
    element,
    attributes,
    mode,
}) => {
    const editor = useSlate();
    let dragService = useDrag();
  
    const onDrop = (e: DragEvent) => {
      e.preventDefault();
      dragService?.send({
        type: 'DROPPED',
        editor: editor,
      })
  
      e.dataTransfer?.clearData();
    };

    const onDragOver = (e) => {
      e.preventDefault()
      // const childPath = ReactEditor.findPath(editor, element)
      // const toPath = Path.parent(childPath)
      dragService?.send({
        type: 'DRAG.OVER',
        toPath: ReactEditor.findPath(editor, element),
        element: e.target as HTMLLIElement,
      })
    }

    let {blockProps} = useBlockProps(element)

    let inRoute = useBlockFlash(attributes.ref, element.id)

    return (
        <li
          {...attributes}
          {...blockProps}
          className={inRoute ? 'flash' : undefined}
          onDrop={onDrop}
          onDragOver={onDragOver}
        >
          <BlockTools block={element} />
          <div>
            {children}
          </div>
        </li>
    )
}

export {ElementDrag}