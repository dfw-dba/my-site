# Changelog

## [1.4.0](https://github.com/dfw-dba/my-site/compare/v1.3.0...v1.4.0) (2026-03-26)


### Features

* security hardening for public repo readiness ([#115](https://github.com/dfw-dba/my-site/issues/115)) ([5a15660](https://github.com/dfw-dba/my-site/commit/5a15660b433b2ccceb5465f28f74fb0474917ab7))


### Bug Fixes

* add dependency so migration waits for Secrets Manager VPC endpoint ([#117](https://github.com/dfw-dba/my-site/issues/117)) ([d6049ef](https://github.com/dfw-dba/my-site/commit/d6049ef102dca2af74ae233992dad4f850ce4b80))
* increase migration Lambda timeout and add Secrets Manager retry ([#118](https://github.com/dfw-dba/my-site/issues/118)) ([782bcc8](https://github.com/dfw-dba/my-site/commit/782bcc8665043b4630403f351d5ca40523cc4e8e))

## [1.3.0](https://github.com/dfw-dba/my-site/compare/v1.2.1...v1.3.0) (2026-03-26)


### Features

* add resilient CDK deployment with pre-flight checks and DNS gate ([#112](https://github.com/dfw-dba/my-site/issues/112)) ([ff022b0](https://github.com/dfw-dba/my-site/commit/ff022b01058defacdfe9d237e55092efa9f47d54))

## [1.2.1](https://github.com/dfw-dba/my-site/compare/v1.2.0...v1.2.1) (2026-03-26)


### Bug Fixes

* bump DB migration version to deploy hobby entry type constraint ([#109](https://github.com/dfw-dba/my-site/issues/109)) ([0e928d2](https://github.com/dfw-dba/my-site/commit/0e928d2ae4b131f840d40f23c4a8b53c2cc8ba8b))

## [1.2.0](https://github.com/dfw-dba/my-site/compare/v1.1.0...v1.2.0) (2026-03-25)


### Features

* add hobby entry type and sort timeline by sort_order ([#107](https://github.com/dfw-dba/my-site/issues/107)) ([53990ef](https://github.com/dfw-dba/my-site/commit/53990ef0dafd6a3b79f0177126a8ee61a1d18a80))

## [1.1.0](https://github.com/dfw-dba/my-site/compare/v1.0.0...v1.1.0) (2026-03-25)


### Features

* **admin:** add MFA QR code, logout button, and 5-day session timeout ([#105](https://github.com/dfw-dba/my-site/issues/105)) ([35728c5](https://github.com/dfw-dba/my-site/commit/35728c5fbf881674e84d298ac79259f851032957))

## [1.0.0](https://github.com/dfw-dba/my-site/compare/v0.4.1...v1.0.0) (2026-03-24)


### ⚠ BREAKING CHANGES

* Staging now requires a separate AWS account. Old same-account staging stacks must be torn down before deploying. API URL changes from stage-api.example.com to api.stage.example.com.
* Staging now requires a separate AWS account. Old same-account staging stacks must be torn down before deploying. API URL changes from stage-api.example.com to api.stage.example.com.

### Features

* **admin:** default threat range to 7 days, add top threats by IP panel ([#101](https://github.com/dfw-dba/my-site/issues/101)) ([7b1e4d6](https://github.com/dfw-dba/my-site/commit/7b1e4d69e252c847ede994bb51ee2556e1e23eea))
* deploy staging to separate AWS account ([#103](https://github.com/dfw-dba/my-site/issues/103)) ([42e801e](https://github.com/dfw-dba/my-site/commit/42e801e79f0019404249b4e9fe1fe1be898cf073))


### Documentation

* fix staging-first deployment instructions ([#104](https://github.com/dfw-dba/my-site/issues/104)) ([85b1633](https://github.com/dfw-dba/my-site/commit/85b16334f19032e8588b91e09b31c21d8d2acf3c))

## [0.4.1](https://github.com/dfw-dba/my-site/compare/v0.4.0...v0.4.1) (2026-03-21)


### Bug Fixes

* **ci:** add version.txt to paths-ignore to skip CI on release-please merges ([#99](https://github.com/dfw-dba/my-site/issues/99)) ([a01060c](https://github.com/dfw-dba/my-site/commit/a01060c0d9943d8f69c1498056061a40f268003d))

## [0.4.0](https://github.com/dfw-dba/my-site/compare/v0.3.2...v0.4.0) (2026-03-21)


### Features

* add client_ip filter and expand/collapse to threat detection dashboard ([#88](https://github.com/dfw-dba/my-site/issues/88)) ([cbb19ad](https://github.com/dfw-dba/my-site/commit/cbb19ad3c649ec63bc419bd081ad195081eb3893))
* add LinkedIn profile links to recommendation carousel ([#79](https://github.com/dfw-dba/my-site/issues/79)) ([652c81e](https://github.com/dfw-dba/my-site/commit/652c81e054d281acf178cee8d85ca51784083b4d))
* add threat detection dashboard section and scheduled log maintenance ([#83](https://github.com/dfw-dba/my-site/issues/83)) ([e948020](https://github.com/dfw-dba/my-site/commit/e948020cfe6bf9569047f34838ea259835c22cb1))


### Bug Fixes

* add migration tracking system and make init scripts idempotent ([#81](https://github.com/dfw-dba/my-site/issues/81)) ([93c440c](https://github.com/dfw-dba/my-site/commit/93c440ca48373c083d680117482b0577d6be1936))
* bump DB migration version to deploy threat detection functions ([#84](https://github.com/dfw-dba/my-site/issues/84)) ([5d93ba4](https://github.com/dfw-dba/my-site/commit/5d93ba4b516baea08415962f2139cc93a03a99d9))
* bump DB migration version to redeploy get_resume function ([#80](https://github.com/dfw-dba/my-site/issues/80)) ([1f452bb](https://github.com/dfw-dba/my-site/commit/1f452bbf156f478388db996725af9cd0ce618121))
* **ci:** upgrade aws-credentials to v6 for Node.js 24, add release-please auto-merge rule ([#97](https://github.com/dfw-dba/my-site/issues/97)) ([a1d0ead](https://github.com/dfw-dba/my-site/commit/a1d0ead38c621a117196696776c32282920dcc5c))
* **ci:** upgrade GitHub Actions to Node.js 24 versions ([#94](https://github.com/dfw-dba/my-site/issues/94)) ([26fe14d](https://github.com/dfw-dba/my-site/commit/26fe14d0cd73cd8464df47b863f0fe8ea52997b9))
* **ci:** upgrade setup-uv to v7 for Node.js 24 support ([#96](https://github.com/dfw-dba/my-site/issues/96)) ([d423403](https://github.com/dfw-dba/my-site/commit/d42340368cc8dd9db91b0db919dee5c3be0cf16b))
* enforce strict sequential deploy chain with staging gate ([#82](https://github.com/dfw-dba/my-site/issues/82)) ([f4d3df7](https://github.com/dfw-dba/my-site/commit/f4d3df7114a85d9e1687aa27429d8be2734b0207))
* guard release-please label step against empty pr output ([#91](https://github.com/dfw-dba/my-site/issues/91)) ([fab05c8](https://github.com/dfw-dba/my-site/commit/fab05c8c80fa4418f3e4498db7f48b0ecb529e1f))
* remove all extra-files from Release Please config ([#86](https://github.com/dfw-dba/my-site/issues/86)) ([4f5282a](https://github.com/dfw-dba/my-site/commit/4f5282a87371dbc71dbe55a8ac80dcd8ef6d8f9b))
* remove JSON extra-files causing Release Please JSONPath crash ([#85](https://github.com/dfw-dba/my-site/issues/85)) ([b860abf](https://github.com/dfw-dba/my-site/commit/b860abfd8e87bfab61581eefbb0973d30b009026))
* use REST API for release-please labels to avoid GraphQL timing issue ([#90](https://github.com/dfw-dba/my-site/issues/90)) ([922b985](https://github.com/dfw-dba/my-site/commit/922b98535e8dab88033ef7f290131c1a1d6205c0))

## [0.3.2](https://github.com/dfw-dba/my-site/compare/my-site-v0.3.1...my-site-v0.3.2) (2026-03-21)


### Bug Fixes

* **ci:** upgrade GitHub Actions to Node.js 24 versions ([#94](https://github.com/dfw-dba/my-site/issues/94)) ([26fe14d](https://github.com/dfw-dba/my-site/commit/26fe14d0cd73cd8464df47b863f0fe8ea52997b9))
* **ci:** upgrade setup-uv to v7 for Node.js 24 support ([#96](https://github.com/dfw-dba/my-site/issues/96)) ([d423403](https://github.com/dfw-dba/my-site/commit/d42340368cc8dd9db91b0db919dee5c3be0cf16b))

## [0.3.1](https://github.com/dfw-dba/my-site/compare/my-site-v0.3.0...my-site-v0.3.1) (2026-03-21)


### Bug Fixes

* guard release-please label step against empty pr output ([#91](https://github.com/dfw-dba/my-site/issues/91)) ([fab05c8](https://github.com/dfw-dba/my-site/commit/fab05c8c80fa4418f3e4498db7f48b0ecb529e1f))

## [0.3.0](https://github.com/dfw-dba/my-site/compare/my-site-v0.2.0...my-site-v0.3.0) (2026-03-21)


### Features

* add client_ip filter and expand/collapse to threat detection dashboard ([#88](https://github.com/dfw-dba/my-site/issues/88)) ([cbb19ad](https://github.com/dfw-dba/my-site/commit/cbb19ad3c649ec63bc419bd081ad195081eb3893))


### Bug Fixes

* use REST API for release-please labels to avoid GraphQL timing issue ([#90](https://github.com/dfw-dba/my-site/issues/90)) ([922b985](https://github.com/dfw-dba/my-site/commit/922b98535e8dab88033ef7f290131c1a1d6205c0))

## [0.2.0](https://github.com/dfw-dba/my-site/compare/my-site-v0.1.0...my-site-v0.2.0) (2026-03-21)


### Features

* add LinkedIn profile links to recommendation carousel ([#79](https://github.com/dfw-dba/my-site/issues/79)) ([652c81e](https://github.com/dfw-dba/my-site/commit/652c81e054d281acf178cee8d85ca51784083b4d))
* add threat detection dashboard section and scheduled log maintenance ([#83](https://github.com/dfw-dba/my-site/issues/83)) ([e948020](https://github.com/dfw-dba/my-site/commit/e948020cfe6bf9569047f34838ea259835c22cb1))


### Bug Fixes

* add migration tracking system and make init scripts idempotent ([#81](https://github.com/dfw-dba/my-site/issues/81)) ([93c440c](https://github.com/dfw-dba/my-site/commit/93c440ca48373c083d680117482b0577d6be1936))
* bump DB migration version to deploy threat detection functions ([#84](https://github.com/dfw-dba/my-site/issues/84)) ([5d93ba4](https://github.com/dfw-dba/my-site/commit/5d93ba4b516baea08415962f2139cc93a03a99d9))
* bump DB migration version to redeploy get_resume function ([#80](https://github.com/dfw-dba/my-site/issues/80)) ([1f452bb](https://github.com/dfw-dba/my-site/commit/1f452bbf156f478388db996725af9cd0ce618121))
* enforce strict sequential deploy chain with staging gate ([#82](https://github.com/dfw-dba/my-site/issues/82)) ([f4d3df7](https://github.com/dfw-dba/my-site/commit/f4d3df7114a85d9e1687aa27429d8be2734b0207))
* remove all extra-files from Release Please config ([#86](https://github.com/dfw-dba/my-site/issues/86)) ([4f5282a](https://github.com/dfw-dba/my-site/commit/4f5282a87371dbc71dbe55a8ac80dcd8ef6d8f9b))
* remove JSON extra-files causing Release Please JSONPath crash ([#85](https://github.com/dfw-dba/my-site/issues/85)) ([b860abf](https://github.com/dfw-dba/my-site/commit/b860abfd8e87bfab61581eefbb0973d30b009026))
