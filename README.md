# Noun Pics

## API

### Get Noun image by ID

| Method | Path        | Description                                                           |
| ------ | ----------- | --------------------------------------------------------------------- |
| GET    | `/{id}`     | Fetch a PNG of the given Noun ID                                      |
| GET    | `/{id}.svg` | Fetch an SVG of the given Noun ID (try also with `.jpg`, and `.webp`) |

### Get a tile of the Nouns owned by an Address or ENS Name

| Method | Path             | Description                                            |
| ------ | ---------------- | ------------------------------------------------------ |
| GET    | `/yourname.ens`  | Get a tile of all Nouns owned by the provided ENS name |
| GET    | `/{ETH Address}` | Get a tile of all Nouns owned by the provided address  |

You can also use the following query parameters with tile endpoints:

| Name               | Default | Description                                                                       |
| ------------------ | ------- | --------------------------------------------------------------------------------- |
| `includeDelegates` | `false` | When building a tile of an address' Nouns, include Nouns delegated to the address |

### Examples

* [https://noun.pics/0](https://noun.pics/0)
* [https://noun.pics/110.jpg](https://noun.pics/110.jpg)
* [https://noun.pics/90.svg](https://noun.pics/90.svg)
* [https://noun.pics/0x2573C60a6D127755aA2DC85e342F7da2378a0Cc5 ](https://noun.pics/0x2573C60a6D127755aA2DC85e342F7da2378a0Cc5)
* [https://noun.pics/subbo.eth](https://noun.pics/subbo.eth)
* [https://noun.pics/hot.4156.eth?includeDelegates=true](https://noun.pics/hot.4156.eth?includeDelegates=true)

## Deployment

## Docker Container

This repository includes a [Dockerfile](Dockerfile.backend) that will run the application and expose an HTTP endpoint on port `3000`.

### Dependencies

noun.pics needs a [redis](https://redis.io) database to connect to and a JSON-RPC provider to query chain data from.

### Configuration

The application is configured using environment variables:

| Variable Name                    | Description                                      | Example                                          |
| -------------------------------- | ------------------------------------------------ | ------------------------------------------------ |
| `CHAIN_ID`                       | The Chain (1-mainnet, 5-goerli) of the network   | `1`                                              |
| `ADDRESS_ID`                     | The Chain ID of any custom deployed chain        | `1`                                              |
| `{GOERLI \|\| MAINNET}_SUBGRAPH` | The URL to a JSON-RPC provider for graphql data  | `https://api.goldsky.com/api/public/project_abc` |
| `PORT`                           | The application's listening port                 | `3000`                                           |
| `REDIS_HOST`                     | The Redis hostname                               | `localhost`                                      |
| `REDIS_PORT`                     | The Redis port                                   | `6380`                                           |
| `REDIS_PASS`                     | The Redis password                               | `bitnami`                                        |
| `BASE_URL`                       | The base URL of the application                  | `https://noun.pics`                              |

### Resources

Here's a [list](https://ethereumnodes.com/) of private/public JSON-RPC provider endpoints

