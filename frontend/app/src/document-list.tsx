import * as React from 'react';
// import {Icons} from 'components/icons'
import { useLocation, useRouteMatch } from 'react-router-dom';
import { Link } from './link';
import { useAuthor } from './mintter-hooks';
import { format } from 'date-fns';
import type documents from '@mintter/api/documents/v1alpha/documents_pb';
import { getPath } from '@utils/routes';

interface Props {
  // TODO: fix types
  // data: documents.Document.AsObject[];
  data: any;
  isLoading: boolean;
  isError: boolean;
  error: any;
  onDeleteDocument?: (id: string) => Promise<void>;
}

interface ItemProps {
  item: any; // TODO: fix types (Document.AsObject + Document)
  onDeleteDocument?: (version: string) => void;
}

export function DocumentList({
  data,
  isLoading,
  isError,
  error,
  onDeleteDocument,
}: Props) {
  if (isLoading) {
    return <p>Loading...</p>;
  }
  if (isError) {
    return <p>ERROR</p>;
  }

  return (
    <div>
      {/* // TODO: fix types */}
      {data.map((item: any) => (
        <ListItem
          key={item.id}
          item={item}
          onDeleteDocument={onDeleteDocument}
        />
      ))}
    </div>
  );
}

function ListItem({ item, onDeleteDocument }: ItemProps) {
  const match = useRouteMatch();
  const location = useLocation();
  // const [prefetched, setPrefetch] = React.useState<boolean>(false)
  const { version, title, subtitle, author: itemAuthor } = item;
  const theTitle = title ? title : 'Untitled Document';

  const { data: author } = useAuthor(itemAuthor);

  const isDraft = React.useMemo(() => location.pathname.includes('drafts'), [
    location.pathname,
  ]);

  const to = React.useMemo(() => {
    const path = `${getPath(match)}${isDraft ? '/editor' : '/p'}/${version}`;
    return path;
  }, [location.pathname]);
  // function handlePrefetch() {
  // if (!prefetched) {
  // TODO: prefetch on hover
  // console.log(`prefetch draft with id ${draft.id}`)
  // setPrefetch(true)
  // }
  // }

  const date = React.useMemo(() => item.doc.getCreateTime().toDate(), [item]);

  return (
    <Link
      to={to}
      className="box-border flex flex-col w-full p-4 mt-2 -mx-4 transition duration-100 bg-transparent group first:mt-4 hover:bg-background-muted"
      // onMouseEnter={handlePrefetch}
    >
      <div className="grid flex-1 grid-cols-12 gap-4">
        <div className={onDeleteDocument ? 'col-span-11' : 'col-span-12'}>
          {!isDraft && location.pathname !== '/library/my-publications' && (
            <div className="flex items-center">
              <div className="w-6 h-6 bg-gray-400 rounded-full" />
              <p className="inline-block mx-2 text-sm font-light text-heading">
                {author?.username}
              </p>
            </div>
          )}
          <h3 className="mt-2 text-xl font-bold leading-5 truncate text-heading">
            {theTitle}
          </h3>
          {subtitle ? <p className="mt-2 font-serif">{subtitle}</p> : null}

          <p className="mt-2 text-xs font-light text-heading">
            {format(new Date(date), 'MMMM d, yyyy')}
          </p>
        </div>
        {onDeleteDocument && (
          <div className="flex items-center justify-end col-span-1">
            <button
              data-testid="delete-button"
              className="opacity-0 group-hover:opacity-100 text-danger"
              onClick={(e) => {
                e.preventDefault();
                const resp = window.confirm(
                  'are you sure you want to delete it?',
                );
                if (resp) {
                  onDeleteDocument(version);
                }
              }}
            >
              {/* //TODO: add Icons
              <Icons.Trash /> */}
              trash
            </button>
          </div>
        )}
      </div>
    </Link>
  );
}
