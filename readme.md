# hitit

hitit is a minimalistic tool for testing an HTTP(S) API. It is a stopgap until I publish the next version of [kaboot](https://github.com/fpereiro/kaboot).

## Current status of the project

The current version of hitit, v0.3.0, is considered to be *unstable* and *incomplete*. [Suggestions](https://github.com/fpereiro/hitit/issues) and [patches](https://github.com/fpereiro/hitit/pulls) are welcome. Future changes planned are:

- Improve multipart/form-data (there's at least one bug related to binary files).
- Support for concurrent testing (a.k.a stress testing).
- Basic profiling.

## Installation

The dependencies of hitit are three:

- [dale](https://github.com/fpereiro/dale)
- [mime](https://github.com/broofa/node-mime)
- [teishi](https://github.com/fpereiro/teishi)

To install, type `npm i hitit`.

## Source code

The complete source code is contained in `hitit.js`. It is about 210 lines long.

## License

hitit is written by Federico Pereiro (fpereiro@gmail.com) and released into the public domain.
