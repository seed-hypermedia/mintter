import {css, styled} from '@app/stitches.config'

export const footerStyles = css({
  background: '$base-background-subtle',
  width: '$full',
  // position: 'absolute',
  // bottom: 0,
  zIndex: '$max',
  display: 'flex',
  justifyContent: 'space-between',
  paddingHorizontal: '$4',
})
export const footerMetadataStyles = css({
  flex: 1,
  overflow: 'hidden',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '$3',
  display: 'flex',
  width: '$full',
})

export const footerButtonsStyles = css({
  display: 'flex',
  flex: 'none',
  gap: '$2',
  padding: '$3',
  paddingRight: 0,
  alignItems: 'center',
})

export const PageFooterSeparator = styled('div', {
  width: 1,
  height: '80%',
  marginLeft: '$4',
  marginRight: '$4',
  background: '$base-component-bg-hover',
})
