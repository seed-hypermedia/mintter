import * as React from 'react';
import { css } from 'emotion';

import { useHistory, useRouteMatch } from 'react-router-dom';
import { Link } from './link';
import { Input } from './input';
import { isLocalNode } from './constants';
import { getPath } from './routes';

interface NavItemProps {
  href: string;
  onClick: () => void;
  isActive: boolean;
  title: string;
  className?: string;
}

// TODO: add custom logo back

export function Topbar({ isPublic = false }: { isPublic?: boolean }) {
  const history = useHistory();
  const match = useRouteMatch();
  const [menuVisible, setMenuVisible] = React.useState<boolean>(false);
  const show = React.useCallback(() => setMenuVisible(true), [setMenuVisible]);
  const hide = React.useCallback(() => setMenuVisible(false), [setMenuVisible]);

  function toggleFormMetadata() {
    if (menuVisible) {
      hide();
    } else {
      show();
    }
  }

  return isPublic ? (
    <div className="p-4 w-full border-b bg-brand-primary">
      <div
        className={`w-full mx-4 md:mx-16 flex items-end justify-between ${css`
          max-width: 50ch;
        `}`}
      >
        <span className="text-primary flex items-center">
          <Link to="/">
            <Logo width="42px" className="fill-current" />
          </Link>
        </span>
        <Link
          to="/"
          className="text-sm font-medium hover:underline text-brand-secondary inline-block"
        >
          ← Back to Home
        </Link>
      </div>
    </div>
  ) : (
    <div
      className={`border-b border-background-muted grid grid-flow-col gap-4`}
    >
      <span className="text-primary flex items-center py-4 pl-4 md:pl-16">
        <Link to={getPath(match)}>
          <Logo width="42px" className="fill-current" />
        </Link>
      </span>
      <div className="py-4">
        <div className={`w-full px-4 md:px-6`}>
          <MintterSearch />
        </div>
      </div>

      <div className="flex justify-end pr-4 py-4">
        {/* TODO: add menu back */}
      </div>
    </div>
  );
}

function MintterSearch() {
  const ref = React.useRef<HTMLInputElement>(null);
  const history = useHistory();
  const match = useRouteMatch();
  // TODO: type dubmit event correctly
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

export function Logo({
  width = '1rem',
  fill = 'currentColor',
  ...rest
}: React.SVGProps<SVGSVGElement>) {
  return (
    <svg width={width} viewBox="0 0 50 50" fill="none" {...rest}>
      <path
        d="M23.153 24.991v7.204A1.82 1.82 0 0121.333 34c-1 0-1.804-.814-1.804-1.805V24.99a1.82 1.82 0 00-3.64 0v7.204A1.82 1.82 0 0114.067 34c-1 0-1.803-.814-1.803-1.805V24.99a1.82 1.82 0 00-3.642 0v7.204A1.82 1.82 0 016.803 34C5.803 34 5 33.186 5 32.195V24.99c0-2.973 2.445-5.398 5.444-5.398 1.392 0 2.66.53 3.623 1.38a5.383 5.383 0 013.624-1.38c3.016 0 5.462 2.425 5.462 5.398zm9.335-4.76c-1 0-1.82.813-1.82 1.804a1.82 1.82 0 003.64 0 1.81 1.81 0 00-1.82-1.805zm1.82 13.043a1.786 1.786 0 00.661-2.46c-.5-.867-1.606-1.15-2.481-.655a1.85 1.85 0 01-.91.248c-1 0-1.82-.814-1.82-1.805V17.805a1.82 1.82 0 00-3.642 0v10.797c0 2.973 2.445 5.398 5.444 5.398a5.45 5.45 0 002.749-.726zm8.979-14.3c-1 0-1.82.814-1.82 1.805a1.82 1.82 0 003.64 0 1.82 1.82 0 00-1.82-1.805zm1.803 14.3a1.786 1.786 0 00.66-2.46c-.5-.867-1.606-1.15-2.481-.655a1.85 1.85 0 01-.91.248c-1 0-1.82-.814-1.82-1.805V17.805c.017-.99-.804-1.805-1.804-1.805s-1.82.814-1.82 1.805v10.797c0 2.973 2.445 5.398 5.444 5.398.964 0 1.91-.248 2.73-.726z"
        fill={fill}
      />
    </svg>
  );
}
