import React from 'react'
import {
  // ReactEditor, useEditor,
  useFocused,
  useSelected,
} from 'slate-react'
import {DragDrop} from '../../BlockPlugin/components/DragDrop'

const Transclusion = (
  {attributes, children, element, className, push},
  ref,
) => {
  const selected = useSelected()
  const focus = useFocused()
  // const editor = useEditor()
  // const path = ReactEditor.findPath(editor, element)

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

  function handlePush(e) {
    e.preventDefault()
    console.log('go to parent document', element.id)
    push && push(`/p/${element.id.split('/')[0]}`)
  }

  return (
    <DragDrop attributes={attributes} element={element} componentRef={ref}>
      <div
        className={`pl-4 pr-0 py-2 border-2 relative bg-background-muted rounded my-1 outline-none ${
          focus && selected ? 'shadow-outline' : ''
        }${className ? className : ''}`}
      >
        <div
          contentEditable={false}
          className="absolute top-0 right-0 transform translate-x-full pl-2"
        >
          <button
            onClick={handlePush}
            className="text-xs text-body-muted hover:text-body transition duration-100"
          >
            Go to Document
          </button>
        </div>
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
        {/* {renderTransclusionContent()} */}
        {children}
      </div>
    </DragDrop>
  )
}

export const TransclusionElement = React.forwardRef(Transclusion)
