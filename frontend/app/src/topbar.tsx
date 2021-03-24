import * as React from 'react';
import { useHistory, useRouteMatch } from 'react-router-dom';
import { Link } from './link';
import { LogoSquare } from './logo-square';
import { Input } from '@mintter/ui-legacy/input';
// import { CustomLogo } from './custom-logo';
import { Grid } from '@mintter/ui-legacy/grid';
import { Container } from '@mintter/ui-legacy/container';
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
    <Grid
      css={{ bc: '$brandPrimary', borderBottom: '1px solid $colors$muted' }}
    >
      <Container
        css={{
          mx: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          py: '$2',
          px: '$3',
        }}
      >
        <Link to="/">
          {/*
          // TODO: add logos
          {isLocal ? (
            <Logo css={{ color: 'white' }} width="42px" />
          ) : (
            <CustomLogo />
          )} */}
        </Link>
        <Link
          to="/"
          className="inline-block text-sm font-medium hover:underline text-brand-secondary"
        >
          ← Back to Home
        </Link>
      </Container>
    </Grid>
  ) : (
    <Grid
      css={{
        gridAutoFlow: 'column',
        gridTemplateColumns: '100px 1fr 100px',
        py: '$2',
        px: '$3',
        borderBottom: '1px solid $colors$muted',
        alignItems: 'center',
      }}
    >
      <Link to={getPath(match)}>
        <LogoSquare css={{ color: '$brandPrimary' }} width="42px" />
      </Link>
      <Container>
        <MintterSearch />
      </Container>
      <DropdownMenu.Root>
        <DropdownMenu.Trigger>Menu</DropdownMenu.Trigger>
        <DropdownMenu.Content>
          <DropdownMenu.Item
            onSelect={() => {
              history.push(`${getPath(match)}/settings`);
            }}
          >
            Settings
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Root>
    </Grid>
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
    <form className="w-full" onSubmit={handleSearch}>
      <Input
        ref={ref}
        name="hash-search"
        type="text"
        placeholder="Enter a publication CID"
        className="rounded-full"
      />
    </form>
  );
}
