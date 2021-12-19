import * as fs from 'fs';
import * as path from 'path';

import { ApiPromise, Keyring } from '@polkadot/api';
import { addressToEvm, evmToAddress } from '@polkadot/util-crypto';

// TODO: WTF??? oO
import * as Web3_ from 'web3';
const Web3 = Web3_ as any;

import { signTransaction } from '../../src/utils/blockchain/unique';

const contractHelpersAbi = JSON.parse(fs.readFileSync(path.join(__dirname, 'contractHelpersAbi.json')).toString());
const nonFungibleAbi = JSON.parse(fs.readFileSync(path.join(__dirname, 'nonFungibleAbi.json')).toString());


const GAS_ARGS = {gas: 2500000};
const MICROUNIQUE = 1_000_000_000_000n;
const MILLIUNIQUE = 1_000n * MICROUNIQUE;
const CENTIUNIQUE = 10n * MILLIUNIQUE;
const UNIQUE = 100n * CENTIUNIQUE;

const connectWeb3 = opalUrl => {
  const provider = new Web3.providers.WebsocketProvider(opalUrl);
  const web3 = new Web3(provider);

  return {web3, provider};
}

const privateKey = (account: string) => {
  const keyring = new Keyring({type: 'sr25519'});

  return keyring.addFromUri(account);
}

const createEthAccount = (web3) => {
  const account = web3.eth.accounts.create();
  web3.eth.accounts.wallet.add(account.privateKey);
  return account.address;
}

const collectionIdToAddress = (address: number): string => {
  if (address >= 0xffffffff || address < 0) throw new Error('id overflow');
  const buf = Buffer.from([0x17, 0xc4, 0xe6, 0x45, 0x3c, 0xc4, 0x9a, 0xaa, 0xae, 0xac, 0xa8, 0x94, 0xe6, 0xd9, 0x68, 0x3e,
    address >> 24,
    (address >> 16) & 0xff,
    (address >> 8) & 0xff,
    address & 0xff,
  ]);
  return Web3.utils.toChecksumAddress('0x' + buf.toString('hex'));
}

const createEthAccountWithBalance = async (api: ApiPromise, web3) => {
  const alice = privateKey('//Alice');
  const account = createEthAccount(web3);
  await transferBalanceToEth(api, alice, account);

  return account;
}

const subToEthLowercase = (eth: string): string => {
  const bytes = addressToEvm(eth);
  return '0x' + Buffer.from(bytes).toString('hex');
}

const subToEth = (eth: string): string => {
  return Web3.utils.toChecksumAddress(subToEthLowercase(eth));
}

const transferBalanceToEth = async (api: ApiPromise, admin, target: string, amount = 1000n * UNIQUE) => {
  const tx = api.tx.balances.transfer(evmToAddress(target), amount);
  return await signTransaction(admin, tx);
}

const contractHelpers = (web3, caller: string) => {
  return new web3.eth.Contract(contractHelpersAbi, '0x842899ECF380553E8a4de75bF534cdf6fBF64049', {from: caller, ...GAS_ARGS});
}

const createEvmCollection = (collectionId: number, from, web3) => {
  return new web3.eth.Contract(nonFungibleAbi, collectionIdToAddress(collectionId), {from});
}

export {
  createEthAccount, createEthAccountWithBalance, createEvmCollection, transferBalanceToEth, subToEth, subToEthLowercase, privateKey, GAS_ARGS, UNIQUE,
  contractHelpers, connectWeb3
}