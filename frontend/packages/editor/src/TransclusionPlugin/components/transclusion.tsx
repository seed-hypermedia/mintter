import * as React from 'react'
import {Draggable} from 'react-beautiful-dnd'
import {useSelected, ReactEditor, useEditor} from 'slate-react'
// import {Editor} from 'slate'
import {useBlockTools} from '../../BlockPlugin/components/blockToolsContext'
import {BlockControls} from '../../components/blockControls'
import {mergeRefs} from '../../mergeRefs'

const Transclusion = ({attributes, children, element, className}, ref) => {
  const selected = useSelected()
  const editor = useEditor()
  const path = ReactEditor.findPath(editor, element)
  const {id: blockId, setBlockId} = useBlockTools()
  const {ref: refAttrs, ...restAttrs} = attributes

  // TODO: add Transclusion markers

  // const [startRect, setStartRect] = React.useState<any>()
  // const [endRect, setEndRect] = React.useState<any>()

  // const getPointRect = (editor, point) =>
  //   // reducing by one to make sure that if the selection is the end of the line, it will not think that the next line is inluded in the selection
  //   getRangeRect(
  //     editor,
  //     Editor.range(editor, {...point, offset: point.offset - 1}),
  //   )
  // const getRangeRect = (editor, range) =>
  //   ReactEditor.toDOMRange(editor, range).getBoundingClientRect()

  // React.useEffect(() => {
  //   // const start = Editor.start(editor, path)
  //   const end = Editor.end(editor, path)
  //   // setStartRect(getPointRect(editor, start))
  //   setEndRect(getPointRect(editor, end))
  // }, [editor, path])

  return (
    <Draggable
      key={element.id}
      draggableId={element.id}
      index={path[path.length - 1]}
    >
      {provided => (
        <div
          {...restAttrs}
          {...provided.draggableProps}
          ref={mergeRefs(provided.innerRef, ref, refAttrs)}
          className={`pl-4 pr-0 py-2 border-2 relative bg-yellow-100 rounded ${
            selected ? 'border-info' : 'border-transparent'
          }${className ? className : ''}`}
          onMouseLeave={() => setBlockId(null)}
          onMouseEnter={() => setBlockId(element.id)}
        >
          {/* <div
            className="fixed"
            style={
              endRect
                ? {
                    top: endRect.top,
                    left: endRect.left,
                    width: 10,
                    height: 10,
                    backgroundColor: 'red',
                  }
                : {}
            }
          /> */}
          <BlockControls
            isHovered={blockId === element.id}
            path={path}
            dragHandleProps={provided.dragHandleProps}
          />
          <div contentEditable={false}>{children}</div>
        </div>
      )}
    </Draggable>
  )
}

export const TransclusionElement = React.forwardRef(Transclusion)
