import { Slot } from '@radix-ui/react-slot';
import { useRef } from 'react';
import { useHistory, useRouteMatch } from 'react-router-dom';

import { Box } from '@mintter/ui/box';
import { Button } from '@mintter/ui/button';
import { Icon } from '@mintter/ui/icon';
import { Text } from '@mintter/ui/text';
import { TextField } from '@mintter/ui/text-field';
import * as DropdownMenu from '@mintter/ui-legacy/dropdown-menu';

import { Container } from '@components/container';
import { getPath } from '@utils/routes';

import { Link } from './link';

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
        <Icon name="Mintter" size="2" color="primary" />
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
            <Button variant="ghost" size="1">
              <Icon name="GearOutlined" size="1" />
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
  const ref = useRef<HTMLInputElement>(null);
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
      <TextField
        ref={ref}
        type="text"
        name="hash-search"
        placeholder="Enter a publication CID"
        shape="pill"
      />
    </Box>
  );
}
