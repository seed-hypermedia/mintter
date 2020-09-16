import React from 'react'
import {ReactEditor, useEditor} from 'slate-react'
import {Block} from './block'
import {useTransclusionHelper} from '../../TransclusionPlugin/TransclusionHelperContext'

function ReadonlyBlockElement(
  {children, element, ...rest},
  ref: React.RefObject<HTMLDivElement>,
) {
  const editor = useEditor()
  const path = ReactEditor.findPath(editor, element)
  const {setTarget, target, onKeyDownHelper} = useTransclusionHelper()

  function onTranscludeClicked(e) {
    e.preventDefault()
    const value = target ? null : e.target
    setTarget(value, path, element)
  }

  const onKeyDown = React.useCallback(
    e => {
      onKeyDownHelper(e, editor)
    },
    [editor, onKeyDownHelper],
  )

  React.useEffect(() => {
    window.addEventListener('keydown', onKeyDown)

    return () => {
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [onKeyDown])

  return (
    <Block
      path={path}
      data-slate-type={element.type}
      ref={ref as any}
      {...rest}
    >
      <div className="right-0 top-0 absolute" contentEditable={false}>
        <button onClick={onTranscludeClicked}>Transclude</button>
      </div>
      {children}
    </Block>
  )
}

// TODO: (Horacio) Fixme types
export const ReadOnlyBlock = React.forwardRef(ReadonlyBlockElement as any)
