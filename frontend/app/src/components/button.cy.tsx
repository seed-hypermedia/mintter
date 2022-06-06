import {styled} from '@app/stitches.config'
import {mountWithAccount} from '@app/test/utils'
import {Box} from '@components/box'
import {Button} from '@components/button'

let Wrapper = styled(Box, {
  backgroundColor: '$base-background-normal',
  display: 'flex',
  gap: '$5',
  padding: '$5',
})

describe('Buttons', () => {
  it('Full Overview', () => {
    let {render} = mountWithAccount()

    render(
      <Box>
        <Wrapper>
          <Button color="primary">Primary</Button>
          <Button color="secondary">Secondary</Button>
          <Button color="success">Success</Button>
          <Button color="warning">Warning</Button>
          <Button color="danger">Danger</Button>
          <Button color="muted">Muted</Button>
        </Wrapper>
        <Wrapper className="dark-theme">
          <Button color="primary">Primary</Button>
          <Button color="secondary">Secondary</Button>
          <Button color="success">Success</Button>
          <Button color="warning">Warning</Button>
          <Button color="danger">Danger</Button>
          <Button color="muted">Muted</Button>
        </Wrapper>
        <Wrapper>
          <Button variant="outlined" color="primary">
            Primary
          </Button>
          <Button variant="outlined" color="secondary">
            Secondary
          </Button>
          <Button variant="outlined" color="success">
            Success
          </Button>
          <Button variant="outlined" color="warning">
            Warning
          </Button>
          <Button variant="outlined" color="danger">
            Danger
          </Button>
          <Button variant="outlined" color="muted">
            Muted
          </Button>
        </Wrapper>
        <Wrapper className="dark-theme">
          <Button variant="outlined" color="primary">
            Primary
          </Button>
          <Button variant="outlined" color="secondary">
            Secondary
          </Button>
          <Button variant="outlined" color="success">
            Success
          </Button>
          <Button variant="outlined" color="warning">
            Warning
          </Button>
          <Button variant="outlined" color="danger">
            Danger
          </Button>
          <Button variant="outlined" color="muted">
            Muted
          </Button>
        </Wrapper>
        <Wrapper>
          <Button variant="ghost" color="primary">
            Primary
          </Button>
          <Button variant="ghost" color="secondary">
            Secondary
          </Button>
          <Button variant="ghost" color="success">
            Success
          </Button>
          <Button variant="ghost" color="warning">
            Warning
          </Button>
          <Button variant="ghost" color="danger">
            Danger
          </Button>
          <Button variant="ghost" color="muted">
            Muted
          </Button>
        </Wrapper>
        <Wrapper className="dark-theme">
          <Button variant="ghost" color="primary">
            Primary
          </Button>
          <Button variant="ghost" color="secondary">
            Secondary
          </Button>
          <Button variant="ghost" color="success">
            Success
          </Button>
          <Button variant="ghost" color="warning">
            Warning
          </Button>
          <Button variant="ghost" color="danger">
            Danger
          </Button>
          <Button variant="ghost" color="muted">
            Muted
          </Button>
        </Wrapper>
      </Box>,
    )
  })
})
