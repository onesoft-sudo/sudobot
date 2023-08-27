## [6.0.1](https://github.com/onesoft-sudo/sudobot/compare/v6.0.0...v6.0.1) (2023-08-27)


### Bug Fixes

* snipe command not working correctly in multiple servers at the same time ([b17186a](https://github.com/onesoft-sudo/sudobot/commit/b17186a13d6e1bad65807ffecd931ede20ee31df))



# [6.0.0](https://github.com/onesoft-sudo/sudobot/compare/v5.82.1...v6.0.0) (2023-08-27)


* feat(permissions)!: add possibility to customize permissions of each level ([fc7e237](https://github.com/onesoft-sudo/sudobot/commit/fc7e237faf0e6fd03d352c4594f28b1ff43f7f42))


### BREAKING CHANGES

* You must run `npx prisma db push` to update the database schema,
and the new schema is a bit different, so you may need to re-organize the permission levels.



## [5.82.1](https://github.com/onesoft-sudo/sudobot/compare/v5.82.0...v5.82.1) (2023-08-27)


### Bug Fixes

* remove `data` property from `DomainRule` since it uses `domains` property instead ([2b291d6](https://github.com/onesoft-sudo/sudobot/commit/2b291d6a8c7fddee3d61abcb145c8315d1707baa))



# [5.82.0](https://github.com/onesoft-sudo/sudobot/compare/v5.81.0...v5.82.0) (2023-08-27)


### Bug Fixes

* const issues ([28349a2](https://github.com/onesoft-sudo/sudobot/commit/28349a2212072cba1324c8fe4ae3f54e94b88abd))


### Features

* **message_rules:** changed blockDomain rule into domain rule for allowing & disallowing ([c366ca5](https://github.com/onesoft-sudo/sudobot/commit/c366ca518623d7a572bdb94fe4551a2f6b220733))



# [5.81.0](https://github.com/onesoft-sudo/sudobot/compare/v5.80.3...v5.81.0) (2023-08-27)


### Features

* **commandPermissionOverwrites:** add OR mode ([fd4c0e1](https://github.com/onesoft-sudo/sudobot/commit/fd4c0e156d3cee24a0cf86f699e6a86465c7902d))
* **permissionOverwrites:** add support of OR mode for every permission check ([c51ebe3](https://github.com/onesoft-sudo/sudobot/commit/c51ebe3f3dc5a166e12da798fed86ee56b7dae1a))



