# [4.111.0](https://github.com/onesoft-sudo/sudobot/compare/v4.110.1...v4.111.0) (2023-07-18)


### Bug Fixes

* autoremove unban queues when running unban itself ([15bd8c6](https://github.com/onesoft-sudo/sudobot/commit/15bd8c6e02371db074b2855ab99c08e6b6d33429))
* mod log messages does not have user ID ([771fa32](https://github.com/onesoft-sudo/sudobot/commit/771fa32942cbbd63ed21eb5125a75a3871897f03))
* mute queues are persistent ([80ef79f](https://github.com/onesoft-sudo/sudobot/commit/80ef79f52c71e9d081a06eba54e4cacc17d17664))
* queue does not get removed ([b789b46](https://github.com/onesoft-sudo/sudobot/commit/b789b463ec2699ca34c56c326ebb078d71f86b50))
* wrong gateway intents ([13bd65a](https://github.com/onesoft-sudo/sudobot/commit/13bd65a33c070b2451df8d94ac86eab3334849d3))


### Features

* add tempban command ([1a9eba2](https://github.com/onesoft-sudo/sudobot/commit/1a9eba2f541325cdcccd848804057321b33f9a14))
* **commands:** ban command now accepts a duration via slash command options ([de0e9d3](https://github.com/onesoft-sudo/sudobot/commit/de0e9d350b799febaf8d68cd4f50f97ca3fe0c27))
* **infractionManager:** add tempban support ([73c9699](https://github.com/onesoft-sudo/sudobot/commit/73c9699760659844ddbc454e863644dd1389551c))



## [4.110.1](https://github.com/onesoft-sudo/sudobot/compare/v4.110.0...v4.110.1) (2023-07-18)


### Bug Fixes

* **commands:** validation of ArgumentType.Link wasn't implmented ([2189233](https://github.com/onesoft-sudo/sudobot/commit/218923309eff9d16740ccd70128927bb6bd54fb9))



# [4.110.0](https://github.com/onesoft-sudo/sudobot/compare/v4.109.1...v4.110.0) (2023-07-18)


### Bug Fixes

* use readonly properties ([e365084](https://github.com/onesoft-sudo/sudobot/commit/e365084780059595cdd17a8f3a1de05cdfd65b56))


### Features

* **commands:** add infraction create command ([5cb7ceb](https://github.com/onesoft-sudo/sudobot/commit/5cb7cebc277dddc6fb6de60a6c4413dfe46971cb))



## [4.109.1](https://github.com/onesoft-sudo/sudobot/compare/v4.109.0...v4.109.1) (2023-07-16)


### Bug Fixes

* **build:** build failure due to prisma client not being generated ([a3d9fc4](https://github.com/onesoft-sudo/sudobot/commit/a3d9fc4bb0bb7140fa66255c33591eb7d02b5150))



# [4.109.0](https://github.com/onesoft-sudo/sudobot/compare/v4.108.0...v4.109.0) (2023-07-16)


### Bug Fixes

* **queues:** queues persist between restarts even after expiring ([d47ff46](https://github.com/onesoft-sudo/sudobot/commit/d47ff4661d3597504686e751007c65f92374eee3))


### Features

* **client:** add fetchUserSafe() function that does not throw an error ([6e072fa](https://github.com/onesoft-sudo/sudobot/commit/6e072fad918c405feb9023d139a845d980bc1617))
* **commands:** add infraction management commands ([ae96f9c](https://github.com/onesoft-sudo/sudobot/commit/ae96f9c8e7dcaa97b739bb5988efc901d02c64a3))
* **commands:** add or/and permission checking ([68aa859](https://github.com/onesoft-sudo/sudobot/commit/68aa859c663372342ca1ad685b4977532c09c181))
* **infractionManager:** add a generateInfractionDetailsEmbed() function ([5dea82f](https://github.com/onesoft-sudo/sudobot/commit/5dea82f559fb820b23ce1a56bb6f9ab52b9c835c))
* **types:** add infraction model type ([a9eae05](https://github.com/onesoft-sudo/sudobot/commit/a9eae05d565e4a46495458463b3319294880b3ed))



