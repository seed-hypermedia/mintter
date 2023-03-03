import {styled} from '@app/stitches.config'

const Title = styled('h3', {
  fontSize: '$4',
  paddingHorizontal: '$4',
  color: '$primary-text-low',
})
export function PanelTitle({children}: {children: React.ReactNode}) {
  return <Title>{children}</Title>
}
