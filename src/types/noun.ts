import { Seed } from './seed';

export interface Noun {
  id: number;
  owner: {
    id: string;
    delegate: {
      id: string;
    };
  };
  seed: Seed;
}
