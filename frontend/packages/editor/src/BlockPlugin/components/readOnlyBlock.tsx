import React from 'react'
import {ReactEditor, useEditor} from 'slate-react'
import {Block} from './block'
import Tippy from '@tippyjs/react'

function ReadonlyBlockElement(
  {children, element, createTransclusion, ...rest},
  ref: React.RefObject<HTMLDivElement>,
) {
  const editor = useEditor()
  const path = ReactEditor.findPath(editor, element)
  const [menuVisible, setMenuVisible] = React.useState<boolean>(false)

  // const show = React.useCallback(() => setMenuVisible(true), [setMenuVisible])
  const hide = React.useCallback(() => setMenuVisible(false), [setMenuVisible])
  const toggle = React.useCallback(() => setMenuVisible(value => !value), [
    setMenuVisible,
  ])

  return (
    <Block
      path={path}
      data-slate-type={element.type}
      innerRef={ref as any}
      {...rest}
    >
      <div className="right-0 top-0 absolute" contentEditable={false}>
        <Tippy
          interactive={true}
          onClickOutside={hide}
          visible={menuVisible}
          content={<TransclusionModal blockId={element.id} />}
        >
          <button
            onClick={() => {
              toggle()
              createTransclusion(element)
            }}
          >
            Transclude
          </button>
        </Tippy>
      </div>
      {children}
    </Block>
  )
}

// TODO: (Horacio) Fixme types
export const ReadOnlyBlock = React.forwardRef(ReadonlyBlockElement as any)

function TransclusionModal({blockId}) {
  React.useEffect(() => {
    console.log('execute Effect', blockId)
  }, [blockId])
  return <div className="bg-white p-4 rounded">MENU HERE</div>
}
