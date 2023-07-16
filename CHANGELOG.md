# [4.109.0](https://github.com/onesoft-sudo/sudobot/compare/v4.108.0...v4.109.0) (2023-07-16)


### Bug Fixes

* **queues:** queues persist between restarts even after expiring ([d47ff46](https://github.com/onesoft-sudo/sudobot/commit/d47ff4661d3597504686e751007c65f92374eee3))


### Features

* **client:** add fetchUserSafe() function that does not throw an error ([6e072fa](https://github.com/onesoft-sudo/sudobot/commit/6e072fad918c405feb9023d139a845d980bc1617))
* **commands:** add infraction management commands ([ae96f9c](https://github.com/onesoft-sudo/sudobot/commit/ae96f9c8e7dcaa97b739bb5988efc901d02c64a3))
* **commands:** add or/and permission checking ([68aa859](https://github.com/onesoft-sudo/sudobot/commit/68aa859c663372342ca1ad685b4977532c09c181))
* **infractionManager:** add a generateInfractionDetailsEmbed() function ([5dea82f](https://github.com/onesoft-sudo/sudobot/commit/5dea82f559fb820b23ce1a56bb6f9ab52b9c835c))
* **types:** add infraction model type ([a9eae05](https://github.com/onesoft-sudo/sudobot/commit/a9eae05d565e4a46495458463b3319294880b3ed))



# [4.108.0](https://github.com/onesoft-sudo/sudobot/compare/v4.107.2...v4.108.0) (2023-07-16)


### Bug Fixes

* **automod:** ignore users having enough permissions or configured roles ([d02483d](https://github.com/onesoft-sudo/sudobot/commit/d02483d7b3c2b621037b92bf42ee833180f5d653))


### Features

* **infractionManager:** send logs and create infraction record on bulk message delete ([0e1ce72](https://github.com/onesoft-sudo/sudobot/commit/0e1ce72c126be29203c144828694a308d15773ec))



## [4.107.2](https://github.com/onesoft-sudo/sudobot/compare/v4.107.1...v4.107.2) (2023-07-14)


### Bug Fixes

* development mode toggling ([266cd8e](https://github.com/onesoft-sudo/sudobot/commit/266cd8eb53db8f511bf5ae372db22062ee1d1f86))



## [4.107.1](https://github.com/onesoft-sudo/sudobot/compare/v4.107.0...v4.107.1) (2023-07-14)


### Bug Fixes

* queue manager attempts to delete the same queue twice ([94bfbba](https://github.com/onesoft-sudo/sudobot/commit/94bfbba077ccad45434ad0c09f7a7f5c4daf0abf))



# [4.107.0](https://github.com/onesoft-sudo/sudobot/compare/v4.106.0...v4.107.0) (2023-07-14)


### Bug Fixes

* specify a queue name in mute command ([304f9f1](https://github.com/onesoft-sudo/sudobot/commit/304f9f18dd276740743917c9f6b62e5b5edd0235))
* use queues ([c0114b9](https://github.com/onesoft-sudo/sudobot/commit/c0114b92205fdb4c00a82bfb9bb4cecc4045e915))


### Features

* add queue manager service to client class ([f4e6e1c](https://github.com/onesoft-sudo/sudobot/commit/f4e6e1c14e012cb899a3a9359ce77c1d747cfc5d))
* add queue system ([b5ebf7a](https://github.com/onesoft-sudo/sudobot/commit/b5ebf7a538309f11d0707a7e36f1a641223b89f6))
* add unban command ([d776959](https://github.com/onesoft-sudo/sudobot/commit/d776959279adb91c97a643dd1d1e0a73d6a3a950))
* **commands:** add unban command ([54bbae1](https://github.com/onesoft-sudo/sudobot/commit/54bbae115adab7ad9284706bcff7aad4bbc609e5))
* **commands:** add unmute command ([2692aaa](https://github.com/onesoft-sudo/sudobot/commit/2692aaa74e3926a53642c320bf44d995023faff6))
* **events:** load queues when the bot logs in ([3dba287](https://github.com/onesoft-sudo/sudobot/commit/3dba28739a3824d2a6c5200764eaf66bc2b40fd5))
* **queues:** add unmute queue ([3945974](https://github.com/onesoft-sudo/sudobot/commit/3945974e14d407cb2102d09ebe16535a462c4aa8))



