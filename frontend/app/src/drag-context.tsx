import {dragMachine} from '@app/drag-machine'
import {useSelector} from '@xstate/react'
import {useContext, createContext, PropsWithChildren} from 'react'
import {InterpreterFrom} from 'xstate'
import {createInterpreterContext} from './utils/machine-utils'

/**
 * we are not using the machine-utils here because we want the `useDrag` hook to be able to return undefined. this is because we should not be able to drag any block inside a publication, and we are calling this hook on each paragraph
 */

export type DragInterpret = InterpreterFrom<typeof dragMachine>

const dragContext = createContext<DragInterpret | null>(null)
dragContext.displayName = 'Drag'

export function DragProvider({
  children,
  ...props
}: PropsWithChildren<{value: DragInterpret | null}>) {
  return <dragContext.Provider {...props}>{children}</dragContext.Provider>
}

export function useDrag() {
  return useContext(dragContext)
}
