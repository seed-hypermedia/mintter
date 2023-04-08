import {useHighlightRef} from '@app/mouse-context'
import {Box} from '@components/box'
import {ReactNode} from 'react'

export function BlockHighLighter({children}: {children: ReactNode}) {
  let id = useHighlightRef()

  return <>{children}</>

  // return (
  //   <Box
  //     css={
  //       id
  //         ? {
  //             flex: 1,
  //             background: 'green',
  //             [`& [data-highlight="${id}"]`]: {
  //               zIndex: 1,
  //             },
  //             [`& [data-highlight="${id}"]:before`]: {
  //               userSelect: 'none',
  //               content: '',
  //               position: 'absolute',
  //               top: '-0.5rem',
  //               right: 0,
  //               left: 0,
  //               width: '200vw',
  //               height: 'calc(100% + 1rem)',
  //               transform: 'translateX(-50%)',
  //               background: 'var(--highlight-surface1)',
  //               // background: 'red',
  //               zIndex: -1,
  //               pointerEvents: 'none',
  //             },
  //             [`& [data-highlight="${id}"]:hover:before`]: {
  //               display: 'none',
  //             },
  //             [`& a[data-highlight="${id}"]`]: {
  //               // [`& [data-highlight="${id}"]`]: {
  //               background: 'var(--highlight-surface2)',
  //             },
  //             [`& q[data-highlight="${id}"] > span`]: {
  //               // [`& [data-highlight="${id}"]`]: {
  //               background: 'var(--highlight-surface3)',
  //               borderBottomColor: 'var(--highlight-surface4)',
  //             },
  //           }
  //         : {
  //             flex: 1,
  //             background: 'green',
  //           }
  //     }
  //   >
  //     {children}
  //   </Box>
  // )
}
