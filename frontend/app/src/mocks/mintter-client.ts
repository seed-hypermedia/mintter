import * as daemon from '@mintter/api/daemon/v1alpha/daemon_pb';
import faker from 'faker';

export function genSeed(
  aezeedPassphrase?: string,
): Promise<daemon.GenSeedResponse> {
  let response = new daemon.GenSeedResponse();
  response.setMnemonicList(new Array(24).map(() => faker.lorem.word(8)));
  // TODO: add aezeedPassphrase?
  return Promise.resolve(response);
}

export function register(
  mnemonicList: string[],
  aezeedPassphrase?: string,
  walletPassword?: any,
): Promise<daemon.RegisterResponse> {
  console.log('hello register');
  return Promise.resolve(new daemon.RegisterResponse());
}
