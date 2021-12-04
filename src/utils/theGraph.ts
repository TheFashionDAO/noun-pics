import axios from 'axios';

export const allNouns = async () =>
  (
    await axios.post(
      'https://api.thegraph.com/subgraphs/name/nounsdao/nouns-subgraph',
      {
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
      },
    )
  ).data.data.nouns;

export const nounsForAddress = async (addr: string, delegate: boolean = false) => {
  return (await allNouns())
    .filter(
      (noun) => {
				const isOwned = noun.owner.id.toLocaleLowerCase() === addr.toLocaleLowerCase()
				const isDelegate = noun.owner.delegate.id.toLocaleLowerCase() === addr.toLocaleLowerCase()
				return isOwned || (delegate && isDelegate)
			}
    )
    .map(normalizeNoun);
}

const normalizeSeed = (seed) => ({
  accessory: Number(seed.accessory),
  background: Number(seed.background),
  body: Number(seed.body),
  glasses: Number(seed.glasses),
  head: Number(seed.head),
});

const normalizeNoun = (noun) => ({
  ...noun,
  id: Number(noun.id),
  seed: normalizeSeed(noun.seed),
});
