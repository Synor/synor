# Change Log

All notable changes to this project will be documented in this file.
See [Conventional Commits](https://conventionalcommits.org) for commit guidelines.

## [0.8.0](https://github.com/Synor/synor/compare/@synor/cli@0.7.0...@synor/cli@0.8.0) (2020-06-27)


### Features

* **cli:** add shell completion support for bash & fish ([8b5d03a](https://github.com/Synor/synor/commit/8b5d03a2bc08a6f189e73b51587ca724e9a0d53c))
* **cli:** add shell completion support for zsh ([9d9a0a0](https://github.com/Synor/synor/commit/9d9a0a034f77e61b3bc2966e425ee73fe1d4d7a1))


### Bug Fixes

* **cli:** fix return type for function: readConfigFile ([82cc9bb](https://github.com/Synor/synor/commit/82cc9bb6444365b12c8526ca620d79971f730a7a))



## [0.7.0](https://github.com/Synor/synor/compare/@synor/cli@0.6.0...@synor/cli@0.7.0) (2020-03-07)

**Note:** Version bump only for package @synor/cli





## [0.6.0](https://github.com/Synor/synor/compare/@synor/cli@0.5.0...@synor/cli@0.6.0) (2020-02-22)


### Features

* **cli:** export type: SynorCLIConfig ([911ce40](https://github.com/Synor/synor/commit/911ce400e1dfd52848765f57f2a55085c05d251c))
* **cli:** support loading config from .ts file ([eaa4699](https://github.com/Synor/synor/commit/eaa469911027382ed697da27073f1ce4cb8f4032)), closes [#3](https://github.com/Synor/cli/issues/3)



## [0.5.0](https://github.com/Synor/synor/compare/@synor/cli@0.4.0...@synor/cli@0.5.0) (2020-02-07)


### Features

* **cli:** add --columns flag for command: current ([daab93f](https://github.com/Synor/synor/commit/daab93fa027b55414943b8ebcb259ae7d702e126))
* **cli:** add --columns, --filter flags for command: info ([cee3e33](https://github.com/Synor/synor/commit/cee3e33c33e1ffdc6267d889033501dbc2211d31))



## [0.4.0](https://github.com/Synor/synor/compare/@synor/cli@0.3.0...@synor/cli@0.4.0) (2020-01-14)


### Features

* **cli:** add --no-header flag for commands: current, pending ([7635583](https://github.com/Synor/synor/commit/76355833ddd00cb0e31c05766c0bf6d06ab5618b))
* **cli:** display date in 'YYYY-MM-DD hh:mm:ss' format ([a75b8dc](https://github.com/Synor/synor/commit/a75b8dc58c25100677c5b86415256c2716e52641))
* **cli:** tweak commands: migrate, validate ([9bbfc1a](https://github.com/Synor/synor/commit/9bbfc1a51e6958f6bcc09cd23449552c5d8834a2))



## [0.3.0](https://github.com/Synor/synor/compare/@synor/cli@0.2.0...@synor/cli@0.3.0) (2020-01-07)


### Bug Fixes

* **cli:** close Synor/cli[#1](https://github.com/Synor/cli/issues/1) ([32b7a87](https://github.com/Synor/synor/commit/32b7a87e13f74b7561e65f33ea64a9a8fae6aa74))



## [0.2.0](https://github.com/Synor/synor/compare/@synor/cli@0.1.0...@synor/cli@0.2.0) (2019-12-25)


### Bug Fixes

* **cli:** tweak src/commands/validate ([81e3f12](https://github.com/Synor/synor/commit/81e3f124ba9aa2242cd997639259bdb839b1b3c8))



## 0.1.0 (2019-12-17)


### Features

* **cli:** add src/command ([e036117](https://github.com/Synor/synor/commit/e036117dc0de107650ddc56ba5099cd30f455e52))
* **cli:** add src/commands/current ([e373e29](https://github.com/Synor/synor/commit/e373e298c25fcabda04d4079a55f56e857eb9690))
* **cli:** add src/commands/drop ([44b2d57](https://github.com/Synor/synor/commit/44b2d5728bc9fbc87020607510ec93f5ef8532cf))
* **cli:** add src/commands/history ([e5c6b6d](https://github.com/Synor/synor/commit/e5c6b6de4886f451c4e9b6bb0eae82c5dc5c91c5))
* **cli:** add src/commands/migrate ([7f791aa](https://github.com/Synor/synor/commit/7f791aa09968bcf8a21c29a010521e6e82aff387))
* **cli:** add src/commands/pending ([c6cea0f](https://github.com/Synor/synor/commit/c6cea0fe0a8e0d21fba149c25df9ba9e9b9f7cf0))
* **cli:** add src/commands/repair ([fd26502](https://github.com/Synor/synor/commit/fd265028bb3e64ccd1c356084689e7df59e7aadd))
* **cli:** add src/commands/validate ([974f8f7](https://github.com/Synor/synor/commit/974f8f7cf2eb9ef8e820786ce61b3e1dab3091f1))
* **cli:** add src/config ([b6e5561](https://github.com/Synor/synor/commit/b6e55613e6302a54463526fe8b6c552b3b00651e))
* **cli:** add src/synor ([c318fa3](https://github.com/Synor/synor/commit/c318fa3be62a80f32add3c4502f51ac87b58ce30))
* **cli:** add src/utils/dynamic-import ([3fd64dc](https://github.com/Synor/synor/commit/3fd64dc4e908a6b7ca32dbb2d43f1acfc007e373))
* **cli:** add src/utils/error ([21bedd7](https://github.com/Synor/synor/commit/21bedd7f468d75ededcf8865cc9cdfa909edb800))
* **cli:** update src/commands/current ([49904d9](https://github.com/Synor/synor/commit/49904d9ec39e0a7ae0f7c7ad02014e9c8d0cb2fa))

### Bug Fixes

* **cli:** handle some SynorError in src/command ([922c8a5](https://github.com/Synor/synor/commit/922c8a5917f9fcb2d22f564a9657c78cf4c13549))
* **cli:** tweak src/command ([1a3fa17](https://github.com/Synor/synor/commit/1a3fa17ed380160d60bf283a6a71437fc906d509))
* **cli:** tweak src/command ([e52fab5](https://github.com/Synor/synor/commit/e52fab50b9d0092648e879857023ff67952ad0cf))
* **cli:** tweak src/commands/{current,drop,history,pending,repair} ([a33f395](https://github.com/Synor/synor/commit/a33f39575d155cf283450d4b4f37e66f616d809d))
* **cli:** tweak src/commands/migrate ([6b92ae3](https://github.com/Synor/synor/commit/6b92ae38adacfca503ac8bfb7b958ad3266e7747))
* **cli:** tweak src/commands/validate ([e76c665](https://github.com/Synor/synor/commit/e76c6657152fa52eeab540bea02f558c8d07da6c))
