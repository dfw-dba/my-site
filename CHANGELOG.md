# Changelog

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
