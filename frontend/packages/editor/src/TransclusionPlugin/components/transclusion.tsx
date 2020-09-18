import React from 'react'
import {useSelected} from 'slate-react'
// import {Editor} from 'slate'
import {DragDrop} from '../../BlockPlugin/components/DragDrop'

const Transclusion = ({attributes, children, element, className}, ref) => {
  const selected = useSelected()

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
    <DragDrop attributes={attributes} element={element} componentRef={ref}>
      <div
        className={`pl-4 pr-0 py-2 border-2 relative bg-background-muted rounded my-1 ${
          selected ? 'border-info' : 'border-transparent'
        }${className ? className : ''}`}
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
        <div contentEditable={false}>{children}</div>
      </div>
    </DragDrop>
  )
}

export const TransclusionElement = React.forwardRef(Transclusion)
