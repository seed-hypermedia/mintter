import { getRenderElement, setDefaults } from '@udecode/slate-plugins';
import * as React from 'react';

import { Block } from './components/block';
import { DEFAULTS_BLOCK } from './defaults';

export const renderElementBlock = (options?: any) => {
  const { block } = setDefaults(options, DEFAULTS_BLOCK);
  const { customProps = {} } = block;

  return getRenderElement({
    ...block,
    // TODO: fix types
    component: (props: any) => <Block {...props} {...customProps} />,
  });
};
