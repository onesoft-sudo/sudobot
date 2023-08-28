# [6.1.0](https://github.com/onesoft-sudo/sudobot/compare/v6.0.3...v6.1.0) (2023-08-28)


### Features

* `ignore_default_permissions` system config option ([b347de8](https://github.com/onesoft-sudo/sudobot/commit/b347de8ca30c19d781c2fa51ef2919e2333f5731))



## [6.0.3](https://github.com/onesoft-sudo/sudobot/compare/v6.0.2...v6.0.3) (2023-08-28)


### Bug Fixes

* ignore bots in snipe command ([6cfd103](https://github.com/onesoft-sudo/sudobot/commit/6cfd10336172ebb1e61c1289e98e13a4cc185a81))



## [6.0.2](https://github.com/onesoft-sudo/sudobot/compare/v6.0.1...v6.0.2) (2023-08-27)


### Bug Fixes

* add missing imports ([513e6cc](https://github.com/onesoft-sudo/sudobot/commit/513e6ccfecebe14aeeb611525539313bef264ca3))



## [6.0.1](https://github.com/onesoft-sudo/sudobot/compare/v6.0.0...v6.0.1) (2023-08-27)


### Bug Fixes

* snipe command not working correctly in multiple servers at the same time ([b17186a](https://github.com/onesoft-sudo/sudobot/commit/b17186a13d6e1bad65807ffecd931ede20ee31df))



# [6.0.0](https://github.com/onesoft-sudo/sudobot/compare/v5.82.1...v6.0.0) (2023-08-27)


* feat(permissions)!: add possibility to customize permissions of each level ([fc7e237](https://github.com/onesoft-sudo/sudobot/commit/fc7e237faf0e6fd03d352c4594f28b1ff43f7f42))


### BREAKING CHANGES

* You must run `npx prisma db push` to update the database schema,
and the new schema is a bit different, so you may need to re-organize the permission levels.



