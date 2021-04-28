import type { match as Match } from 'react-router';

import { ADMIN_ROUTE } from '../constants';

export const createPath = (
  match: Match<Record<string, string>>,
  path: string,
) => {
  if (path.split('')[0] === '/') {
    throw new Error(
      `"createPath function Error => The path passed cannot have '/' at the beginning: check ${path}`,
    );
  }

  return `${match.url}${match.url === '/' ? '' : '/'}${path}`;
};

export const getPath = (match: Match<Record<string, string | undefined>>) => {
  return match.path.includes(ADMIN_ROUTE) ? `/${ADMIN_ROUTE}` : '';
};
