# [4.1.0-beta.1](https://github.com/koordinates/xstate-tree/compare/v4.0.1...v4.1.0-beta.1) (2022-11-29)


### chore

* **view:** deprecate inState ([4c8ad20](https://github.com/koordinates/xstate-tree/commit/4c8ad20fc0386566ecedd82d7ddef47d33f6bfa7)), closes [#33](https://github.com/koordinates/xstate-tree/issues/33)


### feat

* **builders:** builders 2.0 ([f285acd](https://github.com/koordinates/xstate-tree/commit/f285acdde07e277bff84698cdcf71bea3b2c8abc)), closes [#14](https://github.com/koordinates/xstate-tree/issues/14)

## [4.0.1](https://github.com/koordinates/xstate-tree/compare/v4.0.0...v4.0.1) (2022-11-10)


### fix

* **logging:** remove spammy log message ([1b101fc](https://github.com/koordinates/xstate-tree/commit/1b101fc31d7ec02b3ad813949aac6c6562035ff5))

# [4.0.0](https://github.com/koordinates/xstate-tree/compare/v3.0.1...v4.0.0) (2022-11-08)


### feat

* **slots:** better multiSlot handling ([d2e17de](https://github.com/koordinates/xstate-tree/commit/d2e17de1374a646dc2ee2fb3fe9588702f32d9c2))


### Breaking changes

* **slots:** multi slot names in views have changed

## [3.0.1](https://github.com/koordinates/xstate-tree/compare/v3.0.0...v3.0.1) (2022-11-03)


### fix

* **routing:** redirects replace history instead of pushing ([2735fec](https://github.com/koordinates/xstate-tree/commit/2735fec3c49e1f844b3b860f7e170cb0858db8ae))

# [3.0.0](https://github.com/koordinates/xstate-tree/compare/v2.0.11...v3.0.0) (2022-11-03)


### docs

* **README:** add note about expanded code sandbox example ([0ecfe63](https://github.com/koordinates/xstate-tree/commit/0ecfe636567e157f449a790df26a181ec9afaa82)), closes [#28](https://github.com/koordinates/xstate-tree/issues/28)


### feat

* **routing:** async redirects ([e880467](https://github.com/koordinates/xstate-tree/commit/e880467bdcfb743cf7880dce5175e961c3231b12))
* **routing:** composable dynamic routes ([6f178ce](https://github.com/koordinates/xstate-tree/commit/6f178ceef373db2f5942a47b1943906a69524415))


### Breaking changes

* **routing:** Route creation functions have been changed to allow for dynamic routes to be composed together. This effects all route definitions

# [3.0.0-beta.2](https://github.com/koordinates/xstate-tree/compare/v3.0.0-beta.1...v3.0.0-beta.2) (2022-11-03)


### feat

* **routing:** async redirects ([e880467](https://github.com/koordinates/xstate-tree/commit/e880467bdcfb743cf7880dce5175e961c3231b12))

# [3.0.0-beta.1](https://github.com/koordinates/xstate-tree/compare/v2.0.11...v3.0.0-beta.1) (2022-10-31)


### feat

* **routing:** composable dynamic routes ([6f178ce](https://github.com/koordinates/xstate-tree/commit/6f178ceef373db2f5942a47b1943906a69524415))


### Breaking changes

* **routing:** Route creation functions have been changed to allow for dynamic routes to be composed together. This effects all route definitions

## [2.0.11](https://github.com/koordinates/xstate-tree/compare/v2.0.10...v2.0.11) (2022-10-21)


### chore

* **readme:** add todomvc example link ([7331587](https://github.com/koordinates/xstate-tree/commit/7331587a0bf8a0c775a6d1e9e5aef6e4ae613ac0))
* **release:** remove commit analyzer mods ([3ca0946](https://github.com/koordinates/xstate-tree/commit/3ca0946894530056ec223df178113bd5766d73f0))


### docs

* **examples:** add todomvc example ([a638915](https://github.com/koordinates/xstate-tree/commit/a6389154013c8362dea719d7fbf197c644489681))
* **readme:** improve example + add codesandbox link ([3671c01](https://github.com/koordinates/xstate-tree/commit/3671c01518c9bfec59d302ab87986f66bd9fc755))


### perf

* **actions:** do not re-create actions object ([f6b2330](https://github.com/koordinates/xstate-tree/commit/f6b23307f4594a3cc4954fe738b71f79e1eaa9be)), closes [#2](https://github.com/koordinates/xstate-tree/issues/2)

## [2.0.10](https://github.com/koordinates/xstate-tree/compare/v2.0.9...v2.0.10) (2022-09-26)


### chore

* **release:** s/releaseEvents/releaseRules/ ([6e4b375](https://github.com/koordinates/xstate-tree/commit/6e4b37540757de74106b586b3b7c6d7101f5cffc))

## [2.0.9](https://github.com/koordinates/xstate-tree/compare/v2.0.8...v2.0.9) (2022-09-26)


### chore

* **release:** remove added release rules ([0e690c5](https://github.com/koordinates/xstate-tree/commit/0e690c5082d99b0bc17bd3344c75db46d5fe4879))

## [2.0.8](https://github.com/koordinates/xstate-tree/compare/v2.0.7...v2.0.8) (2022-09-25)


### chore

* **readme:** add badges ([b10bd3a](https://github.com/koordinates/xstate-tree/commit/b10bd3aa17ba4fcd9db8782d9230346e6df81523))

## [2.0.7](https://github.com/koordinates/xstate-tree/compare/v2.0.6...v2.0.7) (2022-09-19)


### chore

* **dx:** use npm script for commitlint ([1eef5bb](https://github.com/koordinates/xstate-tree/commit/1eef5bbb5fae63a27a093f2610a3d69138b45e61))
* **readme:** add secret to example ([4285993](https://github.com/koordinates/xstate-tree/commit/42859934d3668f0c18db9853f9f485c5cba26bbe))


### docs

* **contributing:** setup contributing instructions ([2ea2f8f](https://github.com/koordinates/xstate-tree/commit/2ea2f8f6dc243334bb3de600b0db41afb3e9cb20))
* **readme:** improve docs for external audience ([256f75b](https://github.com/koordinates/xstate-tree/commit/256f75b47ad7516e66a4dfa471745ec83f424e71))
* **readme:** link to routing README ([abae28d](https://github.com/koordinates/xstate-tree/commit/abae28d1d967792ac5cedc65809680b472f2772c))

## [2.0.6](https://github.com/koordinates/xstate-tree/compare/v2.0.5...v2.0.6) (2022-09-18)


### docs

* **general:** add missing docs for key functions ([36114a7](https://github.com/koordinates/xstate-tree/commit/36114a7e200f628597d36b4e8425a00d4d74ac84))

## [2.0.5](https://github.com/koordinates/xstate-tree/compare/v2.0.4...v2.0.5) (2022-09-18)


### chore

* **deps:** tidy up dependencies ([908c3a5](https://github.com/koordinates/xstate-tree/commit/908c3a54895f78acd08c4c0e6270230b5046a891))
* **dx:** setup commitlint & husky ([b67a9fd](https://github.com/koordinates/xstate-tree/commit/b67a9fd9e4cc55c4a6ccf89b25db018edc4dd264))
* **npm:** update package metadata ([d5fa5d8](https://github.com/koordinates/xstate-tree/commit/d5fa5d8e73587b83799317719def262eb4f3cba4))


### refactor

* **deps:** drop lodash dependency ([a9d6d5c](https://github.com/koordinates/xstate-tree/commit/a9d6d5c6e32daf6c69eebd4e0dcb7af7f9f0b44d))

## [2.0.4](https://github.com/koordinates/xstate-tree/compare/v2.0.3...v2.0.4) (2022-09-18)


### chore

* **license:** update company name ([9546884](https://github.com/koordinates/xstate-tree/commit/95468840195e80052041019976355d34cdefa04a))

## [2.0.3](https://github.com/koordinates/xstate-tree/compare/v2.0.2...v2.0.3) (2022-09-09)


### fix

* **routing:** missing active route events ([6a14ec7](https://github.com/koordinates/xstate-tree/commit/6a14ec7c6af8c7ce0231e88ffadfa3f26f648e9c))

## [2.0.2](https://github.com/koordinates/xstate-tree/compare/v2.0.1...v2.0.2) (2022-09-08)


### fix

* **perf:** don't delay routing events ([fb898fc](https://github.com/koordinates/xstate-tree/commit/fb898fccf52f0349ee702b2a18727bd6d616450c))

## [2.0.1](https://github.com/koordinates/xstate-tree/compare/v2.0.0...v2.0.1) (2022-09-08)


### fix

* **testing-utils:** inState not supporting partial states ([bf4b77c](https://github.com/koordinates/xstate-tree/commit/bf4b77c71be7a9d14e6f679ab1056acc73d3cfa5))

# [2.0.0](https://github.com/koordinates/xstate-tree/compare/v1.3.0...v2.0.0) (2022-09-03)


### refactor

* **types:** improve usage of xstate type utilities ([a748c13](https://github.com/koordinates/xstate-tree/commit/a748c1312e980f2e5e36b22470330007eb0ba57c)), closes [#11](https://github.com/koordinates/xstate-tree/issues/11)


### Breaking changes

* **types:** The generics of some exported types have changed as a result of the simplification

# [1.3.0](https://github.com/koordinates/xstate-tree/compare/v1.2.0...v1.3.0) (2022-08-26)


### feat

* **xstate:** update builders to use typegen states ([43c2e33](https://github.com/koordinates/xstate-tree/commit/43c2e337cbddaae13dd3f05895b68ffb9faf94a9))

# [1.2.0](https://github.com/koordinates/xstate-tree/compare/v1.1.3...v1.2.0) (2022-08-23)


### feat

* **routing:** matchRoute matched result type uses supplied route types instead of AnyRoute ([ee5735f](https://github.com/koordinates/xstate-tree/commit/ee5735f6fcd456ad7957f3743c3fdd7b6bb22357))

## [1.1.3](https://github.com/koordinates/xstate-tree/compare/v1.1.2...v1.1.3) (2022-08-18)


### fix

* **deps:** make zod a peerDep ([79d4ab2](https://github.com/koordinates/xstate-tree/commit/79d4ab2f26825ba6ee8240bbadee06ac48e59da3))

## [1.1.3-beta.1](https://github.com/koordinates/xstate-tree/compare/v1.1.2...v1.1.3-beta.1) (2022-08-18)


### fix

* **deps:** make zod a peerDep ([79d4ab2](https://github.com/koordinates/xstate-tree/commit/79d4ab2f26825ba6ee8240bbadee06ac48e59da3))

## [1.1.2](https://github.com/koordinates/xstate-tree/compare/v1.1.1...v1.1.2) (2022-08-08)


### chore

* **release:** switch to JS config ([0bbc653](https://github.com/koordinates/xstate-tree/commit/0bbc653ee6119ed442391e574f352741ee88d6bc))

## [1.1.2-beta.1](https://github.com/koordinates/xstate-tree/compare/v1.1.1...v1.1.2-beta.1) (2022-08-08)


### chore

* **release:** switch to JS config ([0bbc653](https://github.com/koordinates/xstate-tree/commit/0bbc653ee6119ed442391e574f352741ee88d6bc))

# [1.1.0-beta.2](https://github.com/koordinates/xstate-tree/compare/v1.1.0-beta.1...v1.1.0-beta.2) (2022-08-04)


### chore

* **release:** commit updated pkg version ([0183d49](https://github.com/koordinates/xstate-tree/commit/0183d49f566a9dc6c366fe2aa1280ac1563f56a9))
