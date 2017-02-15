# hitit

hitit is a minimalistic tool for testing an HTTP API.

## Current status of the project

The current version of hitit, v0.1.2, is considered to be *unstable* and *incomplete*. [Suggestions](https://github.com/fpereiro/hitit/issues) and [patches](https://github.com/fpereiro/hitit/pulls) are welcome. Future changes planned are:

- Support for `multipart` uploads and downloads.
- Support for concurrent testing (a.k.a stress testing).
- Basic profiling.
- HTTPS support.

## Installation

The dependencies of hitit are two:

- [dale](https://github.com/fpereiro/dale)
- [teishi](https://github.com/fpereiro/teishi)

To install, type `npm i hitit`.

## Source code

The complete source code is contained in `hitit.js`. It is about 180 lines long.

Annotated source code will be forthcoming when the library stabilizes.

## License

hitit is written by Federico Pereiro (fpereiro@gmail.com) and released into the public domain.
