import * as client from './mintter-client';
import { expect } from '@esm-bundle/chai';
describe('Mintter Client', () => {
  it('genSeed()', async () => {
    const res = await client.genSeed();
    expect(res.getMnemonicList()).to.have.length(3);
  });
});
