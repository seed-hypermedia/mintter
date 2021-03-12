import * as React from 'react';
import * as apiClient from './mintter-client';
import {
  useQuery,
  useMutation,
  UseQueryResult,
  useInfiniteQuery,
  UseInfiniteQueryResult,
} from 'react-query';
import type { Profile } from '@mintter/api/v2/mintter_pb';

export function useProfile(options = {}) {
  const profileQuery = useQuery(
    ['Profile'],
    async (_ctx) => {
      return await (await apiClient.getProfile()).getProfile();
    },
    options,
  );

  const data = React.useMemo(() => profileQuery.data?.toObject?.(), [
    profileQuery.data,
  ]);

  return {
    ...profileQuery,
    data,
  };
}

export function useAuthor(accountId: string, options = {}) {
  const profileQuery = useQuery(
    accountId && ['Author', accountId],
    async ({ queryKey }) => {
      return apiClient.getProfile(queryKey[1]);
    },
    options,
  );

  const data = React.useMemo(() => profileQuery.data?.toObject?.().profile, [
    profileQuery.data,
  ]);

  return {
    ...profileQuery,
    data,
  };
}

export function useProfileAddrs() {
  const profileAddrsQuery = useQuery(
    ['ProfileAddrs'],
    async () => {
      return await apiClient.getProfileAddress();
    },
    {
      refetchInterval: 5000,
    },
  );

  const data = React.useMemo(
    () => profileAddrsQuery.data?.toObject().addrsList,
    [profileAddrsQuery.data],
  );

  return {
    ...profileAddrsQuery,
    data,
  };
}

export function useConnectionList({ page } = { page: 0 }, options = {}) {
  const connectionsQuery = useQuery(
    ['ListConnections'],
    async ({ queryKey }) => {
      return apiClient.listProfiles();
    },
    {
      refetchOnWindowFocus: true,
      refetchInterval: 5000,
      ...options,
    },
  );

  const data = React.useMemo(
    () => connectionsQuery.data?.toObject().profilesList,
    [connectionsQuery.data],
  );

  return {
    ...connectionsQuery,
    data,
  };
}

export function useSuggestedConnections({ page } = { page: 0 }, options = {}) {
  const suggestionsQuery = useQuery(
    ['ListSuggestedConnections', page],
    async () => {
      return apiClient.listSuggestedProfiles();
    },
    {
      refetchOnWindowFocus: true,
      refetchInterval: 5000,
      ...options,
    },
  );

  const data = React.useMemo(
    () => suggestionsQuery.data?.toObject().profilesList,
    [suggestionsQuery.data],
  );

  return {
    ...suggestionsQuery,
    data,
  };
}

export function useConnectionCreate() {
  const { mutateAsync: connectToPeer, ...mutationOptions } = useMutation(
    (peerIds: string[]) => apiClient.connectToPeer(peerIds),
    {
      onSuccess: () => {
        // TODO: refetch all these without queryCache
        // queryCache.refetchQueries(['ListConnections']);
        // queryCache.refetchQueries(['ListSuggestedConnections']);
        // queryCache.refetchQueries(['Documents']);
      },
      onError: (params) => {
        throw new Error(
          `Connection to Peer error -> ${JSON.stringify(params)}`,
        );
      },
    },
  );

  return {
    connectToPeer,
    ...mutationOptions,
  };
}

export function usePublications(options = {}) {
  const docsQuery = useQuery(
    'Publications',
    async () => await apiClient.listPublications(),
    {
      ...options,
      refetchOnWindowFocus: true,
      // refetchInterval: 5000,
    },
  );
  console.log(
    '🚀 ~ file: mintter-hooks.ts ~ line 158 ~ usePublications ~ docsQuery',
    docsQuery,
  );

  const data = React.useMemo(
    () =>
      docsQuery.data?.getPublicationsList().map((doc) => {
        const data = doc.toObject();
        console.log({ data });
        return {
          doc,
          ...data,
        };
      }),
    [docsQuery.data],
  );

  return {
    ...docsQuery,
    data,
  };
}

export function useOthersPublications(options = {}) {
  const docsQuery = usePublications(options);
  const { data: profile } = useProfile();

  const userId = React.useMemo(() => profile?.accountId, [profile]);

  const data = React.useMemo(
    () =>
      docsQuery.data?.filter(({ document }) => {
        return document?.author !== userId;
      }),
    [docsQuery.data, userId],
  );

  return {
    ...docsQuery,
    data,
  };
}

export function useMyPublications(options = {}) {
  const docsQuery = usePublications(options);
  const { data: profile } = useProfile();

  const userId = React.useMemo(() => profile?.accountId, [profile]);

  const data = React.useMemo(
    () =>
      docsQuery.data?.filter(({ document }) => {
        return document?.author === userId;
      }),
    [docsQuery.data, userId],
  );

  return {
    ...docsQuery,
    data,
  };
}

export function useDrafts(options = {}) {
  const draftsQuery = useQuery(
    'Drafts',
    async () => apiClient.listDrafts(),
    options,
  );

  const data = React.useMemo(() => draftsQuery.data?.getDocumentsList(), [
    draftsQuery.data,
  ]);

  return {
    ...draftsQuery,
    data,
  };
}
