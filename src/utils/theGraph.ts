import axios from 'axios';
import { Seed, NormalizedNoun } from '../types/graphql';

export const createSubgraphApiUri = (
  network?: string,
  version?: string,
): string => {
  const custom = process.env[`${network?.toUpperCase()}_SUBGRAPH`];
  const net = network ? `nouns-${network?.toLowerCase()}` : 'nouns';
  const ver = version ? `${version}/gn` : 'gn';
  // https://api.thegraph.com/subgraphs/name/nounsdao/nouns-subgraph // mainnet default
  return (
    custom ||
    `https://api.goldsky.com/api/public/project_cldf2o9pqagp43svvbk5u3kmo/subgraphs/${net}/${ver}`
  );
};

export const allNouns = async (network?: string, version?: string) =>
  (
    await axios.post(createSubgraphApiUri(network, version), {
      query: `{
  nouns(first: 1000) {
    id
    seed {
      background
      body
      accessory
      head
      glasses
    }
    owner {
      id
			delegate {
				id
			}
    }
  }
}
`,
    })
  ).data.data.nouns;

export const nounsForAddress = async (addr: string, delegate = false) => {
  return (await allNouns())
    .filter((noun: any) => {
      const isOwned =
        noun.owner.id.toLocaleLowerCase() === addr.toLocaleLowerCase();
      const isDelegate =
        noun.owner.delegate.id.toLocaleLowerCase() === addr.toLocaleLowerCase();
      return isOwned || (delegate && isDelegate);
    })
    .map(normalizeNoun);
};

const normalizeSeed = (seed: Seed) => ({
  accessory: Number(seed.accessory),
  background: Number(seed.background),
  body: Number(seed.body),
  glasses: Number(seed.glasses),
  head: Number(seed.head),
});

const normalizeNoun = (noun: NormalizedNoun) => ({
  ...noun,
  id: Number(noun.id),
  seed: normalizeSeed(noun.seed),
});
