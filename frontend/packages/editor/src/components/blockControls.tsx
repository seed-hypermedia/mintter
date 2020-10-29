import React, {useEffect, useCallback} from 'react'
import {useEditor, useReadOnly} from 'slate-react'
import {useHelper} from '../HelperPlugin/components/HelperContext'
import {useTransclusionHelper} from '../TransclusionPlugin/TransclusionHelperContext'
import {css} from 'emotion'

export function BlockControls({element, show, path, dragRef, className = ''}) {
  const {setTarget, target, onKeyDownHelper} = useHelper()
  const readOnly = useReadOnly()

  const editor = useEditor()
  const {
    setTarget: setTranscludeTarget,
    target: transcludeTarget,
    onKeyDownHelper: onKeyDownTranscludeHelper,
  } = useTransclusionHelper()

  function onTranscludeClicked(e) {
    e.preventDefault()
    const value = transcludeTarget ? null : e.target
    setTranscludeTarget(value, path, element)
  }

  function onAddClicked(e) {
    e.preventDefault()
    const value = target ? null : e.target
    setTarget(value, path)
  }

  const onKeyDown = useCallback(
    e => {
      onKeyDownHelper(e, editor)
      readOnly && onKeyDownTranscludeHelper(e, editor)
    },
    [editor, onKeyDownHelper, onKeyDownTranscludeHelper, readOnly],
  )

  useEffect(() => {
    window.addEventListener('keydown', onKeyDown)

    return () => {
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [onKeyDown])
  return (
    <div
      className={`absolute left-0 pr-2 ${css`
        transform: translateX(-100%);
      `} ${
        readOnly ? '' : 'grid-flow-col-dense grid gap-2 grid-cols-2'
      } transition duration-200 ${
        show ? 'opacity-100' : 'opacity-0'
      } ${className}`}
      contentEditable={false}
    >
      <button
        onClick={readOnly ? onTranscludeClicked : undefined}
        className="rounded-sm text-body hover:bg-background-muted flex p-1 mt-1 items-center justify-center"
        ref={readOnly ? null : dragRef}
      >
        <svg viewBox="0 0 16 24" width="12px">
          <path
            d="M3.5 6a1.5 1.5 0 100-3 1.5 1.5 0 000 3zM14 4.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0zM12.5 21a1.5 1.5 0 100-3 1.5 1.5 0 000 3zM14 12a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0zM5 19.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0zM3.5 13.5a1.5 1.5 0 100-3 1.5 1.5 0 000 3z"
            fill="currentColor"
          />
        </svg>
      </button>
      {!readOnly && (
        <button
          onClick={onAddClicked}
          className="rounded-sm text-body hover:bg-background-muted flex p-1 mt-1 items-center justify-center"
        >
          <svg viewBox="0 0 16 16" width="16px" fill="none">
            <path
              d="M12.667 8.667h-4v4H7.334v-4h-4V7.334h4v-4h1.333v4h4v1.333z"
              fill="currentColor"
            />
          </svg>
        </button>
      )}
    </div>
  )
}
