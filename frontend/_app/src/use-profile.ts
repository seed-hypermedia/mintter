import * as React from 'react';
import * as apiClient from './mintter-client';
import { useQuery, useMutation } from 'react-query';
import type mintter from '@mintter/api/v2/mintter_pb';

export function useProfile(options = {}) {
  const profileQuery = useQuery<mintter.Profile | undefined>(
    ['Profile'],
    async (context) => {
      return await apiClient.getProfile();
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

  // const data = React.useMemo(() => profileQuery.data?.toObject?.(), [
  //   profileQuery.data,
  // ]);

  // return {
  //   ...profileQuery,
  //   data,
  // };
}

// export function useProfileAddrs() {
//   const profileAddrsQuery = useQuery(
//     ['ProfileAddrs'],
//     apiClient.getProfileAddrs,
//     {
//       refetchInterval: 5000,
//     },
//   );

//   const data = useMemo(() => profileAddrsQuery.data?.toObject().addrsList, [
//     profileAddrsQuery.data,
//   ]);

//   return {
//     ...profileAddrsQuery,
//     data,
//   };
// }

// export function useConnectionList({ page } = { page: 0 }, options = {}) {
//   const connectionsQuery = usePaginatedQuery(
//     ['ListConnections', page],
//     apiClient.listConnections,
//     {
//       refetchOnWindowFocus: true,
//       refetchInterval: 5000,
//       ...options,
//     },
//   );

//   const data = useMemo(() => connectionsQuery.data?.toObject().profilesList, [
//     connectionsQuery.data,
//   ]);

//   return {
//     ...connectionsQuery,
//     data,
//   };
// }

// export function useSuggestedConnections({ page } = { page: 0 }, options = {}) {
//   const suggestionsQuery = usePaginatedQuery(
//     ['ListSuggestedConnections', page],
//     apiClient.listSuggestedConnections,
//     {
//       refetchOnWindowFocus: true,
//       refetchInterval: 5000,
//       ...options,
//     },
//   );

//   const data = useMemo(() => suggestionsQuery.data?.toObject().profilesList, [
//     suggestionsQuery.data,
//   ]);

//   return {
//     ...suggestionsQuery,
//     data,
//   };
// }

// export function useConnectionCreate() {
//   const [connectToPeer, mutationOptions] = useMutation(
//     (peerIds?: string[]) => apiClient.connectToPeerById(peerIds),
//     {
//       onSuccess: () => {
//         queryCache.refetchQueries(['ListConnections']);
//         queryCache.refetchQueries(['ListSuggestedConnections']);
//         queryCache.refetchQueries(['Documents']);
//       },
//       onError: (params) => {
//         throw new Error(
//           `Connection to Peer error -> ${JSON.stringify(params)}`,
//         );
//       },
//     },
//   );

//   return {
//     connectToPeer,
//     ...mutationOptions,
//   };
// }
