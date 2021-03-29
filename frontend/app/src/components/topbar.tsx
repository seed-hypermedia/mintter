import * as React from 'react';
import { useHistory, useRouteMatch } from 'react-router-dom';
import { Slot } from '@radix-ui/react-slot';
import { Link } from '../link';
import { LogoSquare } from '../logo-square';
import { Input } from '@components/input';
// import { CustomLogo } from './custom-logo';
import { Container } from '@components/container';
import { Box } from '@mintter/ui/box';
import { Text } from '@mintter/ui/text';
import { Button } from '@mintter/ui/button';
import { SettingsIcon } from '@mintter/ui/icons';
import * as DropdownMenu from '@mintter/ui-legacy/dropdown-menu';
import { getPath } from '@utils/routes';

interface NavItemProps {
  href: string;
  onClick: () => void;
  isActive: boolean;
  title: string;
  className?: string;
}

export function Topbar({ isPublic = false }) {
  const history = useHistory();
  const match = useRouteMatch();

  return isPublic ? (
    <Box>public topbar here</Box>
  ) : (
    <Box
      css={{
        display: 'grid',
        gridAutoFlow: 'column',
        gridTemplateColumns: '100px 1fr 100px',
        paddingHorizontal: '$5',
        height: 64,
        gap: '$4',
        borderBottom: '1px solid $colors$background-neutral',
        alignItems: 'center',
      }}
    >
      <Link to={getPath(match)}>
        <LogoSquare css={{ color: '$primary-default' }} width="42px" />
      </Link>
      <Container
        css={{
          marginHorizontal: 'auto',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <MintterSearch />
      </Container>
      <Box css={{ display: 'flex', justifyContent: 'flex-end' }}>
        <DropdownMenu.Root>
          <DropdownMenu.Trigger as={Slot}>
            <Button color="transparent" variant="solid" css={{ padding: '$2' }}>
              <SettingsIcon />
            </Button>
          </DropdownMenu.Trigger>
          <DropdownMenu.Content>
            <DropdownMenu.Item
              css={{
                '&:hover, &:active, &:focus': {
                  background: '$primary-muted',
                },
              }}
              onSelect={() => {
                history.push(`${getPath(match)}/settings`);
              }}
            >
              <Text css={{ color: '$text-default' }}>Settings</Text>
            </DropdownMenu.Item>
          </DropdownMenu.Content>
        </DropdownMenu.Root>
      </Box>
    </Box>
  );
}

function MintterSearch() {
  const ref = React.useRef<HTMLInputElement>(null);
  const history = useHistory();
  const match = useRouteMatch();
  // TODO: fix types
  async function handleSearch(e: any) {
    e.preventDefault();
    let to = ref.current?.value as string;
    if (to.includes('mintter://')) {
      to = to.split('/')[2];
    }
    // console.log('input value', {to, original: ref.current.value})

    if (ref.current) {
      ref.current.value = '';
    }

    history.push(`${getPath(match)}/p/${to}`);
  }

  return (
    <Box as="form" css={{ width: '100%' }} onSubmit={handleSearch}>
      <Input
        ref={ref}
        name="hash-search"
        type="text"
        placeholder="Enter a publication CID"
        css={{ borderRadius: '$pill', paddingHorizontal: '$6' }}
      />
    </Box>
  );
}
