# Changelog

## [3.3.1](https://github.com/infodusha/next-env-space/compare/v3.3.0...v3.3.1) (2026-09-14)


### Bug Fixes

* no build-time values ([c677333](https://github.com/infodusha/next-env-space/commit/c677333f69d2c983e74f60a8cb08c7b47a571ede))

## [3.3.0](https://github.com/infodusha/next-env-space/compare/v3.2.1...v3.3.0) (2026-09-12)


### Features

* refactor & simplify code ([ad02ccd](https://github.com/infodusha/next-env-space/commit/ad02ccd870141f1fd06a046dc749d09acfe0153c))
* throw at misuse ([4fc6ad3](https://github.com/infodusha/next-env-space/commit/4fc6ad3086fdee1cdf2b30d673a5f34f715c7eb0))


### Bug Fixes

* handle unstable_cache behavior ([5b50213](https://github.com/infodusha/next-env-space/commit/5b5021371c6cb80f13b0d4e95f637729ac968fbb))

## [3.2.1](https://github.com/infodusha/next-env-space/compare/v3.2.0...v3.2.1) (2026-09-11)


### Bug Fixes

* throw from get() only in a build-time prerender ([de9f483](https://github.com/infodusha/next-env-space/commit/de9f483918e8c9dec9de3517856b78f9e1919ee3))

## [3.2.0](https://github.com/infodusha/next-env-space/compare/v3.1.0...v3.2.0) (2026-09-11)


### Features

* preserve error overlay ([dfa2694](https://github.com/infodusha/next-env-space/commit/dfa2694ff48920c35f009445b6e7c348a7739f16))


### Bug Fixes

* hide "Invalid hook cal" for `getAsync` ([86b883f](https://github.com/infodusha/next-env-space/commit/86b883f6792e39f7583fe99c607226e0a52acfdb))

## [3.1.0](https://github.com/infodusha/next-env-space/compare/v3.0.0...v3.1.0) (2026-08-31)


### Features

* allow getAsync() outside of request scope ([85c1eb8](https://github.com/infodusha/next-env-space/commit/85c1eb8583274c0481897a7e318c8605f7ce8a1a))

## [3.0.0](https://github.com/infodusha/next-env-space/compare/v2.0.0...v3.0.0) (2026-08-30)


### ⚠ BREAKING CHANGES

* rename UseClientEnv to ClientEnvProvider, WithClientEnv to ClientEnvScript
* use standard schema

### Features

* InferEnv accepts a space, fix duplicate-name warning on hot reload ([f585b10](https://github.com/infodusha/next-env-space/commit/f585b1075836e460737ea33667814d84d2402a61))
* rename UseClientEnv to ClientEnvProvider, WithClientEnv to ClientEnvScript ([3b46a03](https://github.com/infodusha/next-env-space/commit/3b46a031cbcdf5df34ae592fb47915da940a20e3))
* use standard schema ([b9b311e](https://github.com/infodusha/next-env-space/commit/b9b311ea25326557b185b6260a952df3ce835c7b))


### Bug Fixes

* cleanup guards - no runtime checks needed ([fab14f4](https://github.com/infodusha/next-env-space/commit/fab14f46b8e63cfe3c515effdd99f3b27bfc157c))
* do not publish sourcemaps ([fa966da](https://github.com/infodusha/next-env-space/commit/fa966daca532defc9c52485cdb9bc49e370f3558))

## [2.0.0](https://github.com/infodusha/next-env-space/compare/v1.0.3...v2.0.0) (2026-08-30)


### ⚠ BREAKING CHANGES

* rename get functions
* remove standalone  getEnvAsync

### Features

* add UseClientEnv to provide instead of a script ([cf82c89](https://github.com/infodusha/next-env-space/commit/cf82c8996a4a3e729db0f87659966af20d8e34a5))
* aggregate env errors and test cache components ([369cb10](https://github.com/infodusha/next-env-space/commit/369cb10825b0849087e37016498d8b4c6034ca37))
* extra assets ([3adff9a](https://github.com/infodusha/next-env-space/commit/3adff9ad228e9e71cc2e1767bb0da489c79efbdd))
* remove standalone  getEnvAsync ([4d75ace](https://github.com/infodusha/next-env-space/commit/4d75aceb956ed329f4e603feb117c17bb30c95a8))
* rename get functions ([526ca3f](https://github.com/infodusha/next-env-space/commit/526ca3fa90042d4d26dd348b3698d0c142febfc1))
* support cache-components ([8272785](https://github.com/infodusha/next-env-space/commit/82727854eb6f485a331a80fee215ce547f1f7a3f))
* support use() for getEnvAsync() ([b7639a2](https://github.com/infodusha/next-env-space/commit/b7639a242fd0218b7de232f27a00950dc8bb2316))


### Bug Fixes

* remove readProcessEnv() ([acd7cec](https://github.com/infodusha/next-env-space/commit/acd7cecdc520cf643d938781d2b51b70abc4b3c7))
* simplify README ([0a425c0](https://github.com/infodusha/next-env-space/commit/0a425c08f3375c939f9de5bca93a207d70a0ec28))

## [1.0.3](https://github.com/infodusha/next-env-space/compare/v1.0.2...v1.0.3) (2026-08-29)


### Bug Fixes

* ci publish ([df7ad57](https://github.com/infodusha/next-env-space/commit/df7ad57c9d04419b83ba647d0f6a39b45f60874b))

## [1.0.2](https://github.com/infodusha/next-env-space/compare/v1.0.1...v1.0.2) (2026-08-29)


### Bug Fixes

* ignore CHANGELOG formatting ([02f0522](https://github.com/infodusha/next-env-space/commit/02f0522ed661923ef7357988a1b5a9ae168f27ee))

## [1.0.1](https://github.com/infodusha/next-env-space/compare/v1.0.0...v1.0.1) (2026-08-29)


### Bug Fixes

* rename examples ([16478d5](https://github.com/infodusha/next-env-space/commit/16478d54399232a1b7278381a9bdc6377d2ff7c3))
