import {css} from '@app/stitches.config'

export const headerStyles = css({
  background: '$base-background-subtle',
  width: '$full',
  // position: 'absolute',
  // top: 0,
  // zIndex: '$max',
  display: 'flex',
  justifyContent: 'space-between',
  paddingHorizontal: '$4',
})
export const headerMetadataStyles = css({
  flex: 1,
  overflow: 'hidden',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '$3',
  display: 'flex',
  width: '$full',
})

export const headerButtonsStyles = css({
  display: 'flex',
  flex: 'none',
  gap: '$2',
  padding: '$3',
  paddingRight: 0,
  alignItems: 'center',
})
