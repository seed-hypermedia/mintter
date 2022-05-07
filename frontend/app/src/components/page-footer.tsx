import {css, styled} from '@app/stitches.config'

export const footerStyles = css({
  background: '$base-background-subtle',
  width: '$full',
  position: 'absolute',
  bottom: 0,
  zIndex: '$max',
  display: 'flex',
  justifyContent: 'space-between',
  paddingHorizontal: '$5',
})
export const footerMetadataStyles = css({
  flex: 'none',
  padding: '$5',
  display: 'flex',
  alignItems: 'center',
})

export const footerButtonsStyles = css({
  display: 'flex',
  gap: '$5',
  padding: '$5',
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
