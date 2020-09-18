import React, {useEffect, useCallback} from 'react'
import {css} from 'emotion'
import {useEditor, useReadOnly} from 'slate-react'
import {useHelper} from '../HelperPlugin/components/HelperContext'

export function BlockControls({show, path, dragRef}) {
  const {setTarget, target, onKeyDownHelper} = useHelper()
  const readOnly = useReadOnly()

  const editor = useEditor()

  function onAddClicked(e) {
    e.preventDefault()
    const value = target ? null : e.target
    setTarget(value, path)
  }

  const onKeyDown = useCallback(
    e => {
      onKeyDownHelper(e, editor)
    },
    [editor, onKeyDownHelper],
  )

  useEffect(() => {
    window.addEventListener('keydown', onKeyDown)

    return () => {
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [onKeyDown])
  return (
    <div
      className={`absolute top-0 left-0 transition duration-200 flex items-center justify-end mt-3 ${
        show ? 'opacity-100' : 'opacity-0'
      } ${css`
        transform: translateX(-100%);
      `}`}
      contentEditable={false}
    >
      <div
        className="rounded-sm bg-transparent text-body hover:bg-background-muted w-6 h-8 p-1 mx-1"
        ref={dragRef}
      >
        <svg width="1em" height="1.5em" viewBox="0 0 16 24" fill="none">
          <path
            d="M3.5 6a1.5 1.5 0 100-3 1.5 1.5 0 000 3zM14 4.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0zM12.5 21a1.5 1.5 0 100-3 1.5 1.5 0 000 3zM14 12a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0zM5 19.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0zM3.5 13.5a1.5 1.5 0 100-3 1.5 1.5 0 000 3z"
            fill="currentColor"
          />
        </svg>
      </div>
      {!readOnly && (
        <button
          onClick={onAddClicked}
          className="rounded-sm bg-transparent text-body hover:bg-background-muted w-8 h-8 p-1 mx-1"
        >
          <svg width="1.5em" height="1.5em" viewBox="0 0 16 16" fill="none">
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
