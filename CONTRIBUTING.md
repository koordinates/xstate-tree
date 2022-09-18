# Contributing

Thank you for your interest in contributing to xstate-tree! This project is made possible by contributors like you, and we welcome any contributions to the code base and the documentation.

## Environment

- Ensure you have the latest version of Node and NPM.
- Run `npm install` to install all needed dev dependencies.

## Making Changes

Pull requests are encouraged. If you want to add a feature or fix a bug:

1. [Fork](https://docs.github.com/en/github/getting-started-with-github/fork-a-repo) and [clone](https://docs.github.com/en/github/creating-cloning-and-archiving-repositories/cloning-a-repository) the [repository](https://github.com/koordinates/xstate-tree)
2. [Create a separate branch](https://docs.github.com/en/desktop/contributing-and-collaborating-using-github-desktop/managing-branches) for your changes
3. Make your changes, and ensure that it is formatted by [Prettier](https://prettier.io) and type-checks without errors in [TypeScript](https://www.typescriptlang.org/)
4. Write tests that validate your change and/or fix.
5. Run `npm run build` and then run tests with `npm run test`
6. Run api-extractor and update xstate-tree.api.md if it says the document has changed.
7. Commit your changes following conventional commit format, use `git cz` to help you with this.
8. Push your branch and open a PR 🚀