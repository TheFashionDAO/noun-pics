import fs from 'fs';
import { ContractAddresses } from '@nouns/sdk/dist/contract/types';
import defaultAddresses from '../data/defaultAddresses.json';

let addresses: Record<string, ContractAddresses> = {};

// Check if the file exists before importing it
if (fs.existsSync('src/data/addresses.json')) {
  addresses = require('../data/addresses.json');
}

/**
 * Get addresses of contracts that have been deployed to the
 * Ethereum mainnet or a supported testnet. Throws if there are
 * no known contracts deployed on the corresponding chain.
 * @param chainId The desired chainId
 */
export const getContractAddressesForChainOrThrow = (
  chainId: number,
): ContractAddresses => {
  const _addresses: Record<string, ContractAddresses> = {
    ...defaultAddresses,
    ...addresses,
  };
  if (!_addresses[chainId]) {
    throw new Error(
      `Unknown chain id (${chainId}). No known contracts have been deployed on this chain.`,
    );
  }
  return _addresses[chainId];
};
