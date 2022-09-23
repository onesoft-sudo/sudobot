# Changelog

### v3.1.0 (development)
* Performance Improvements
* Now Using MongoDB as Database instead of SQLite **[BREAKING CHANGE]**
* A full refactor of the API
* Dockerized the project
* Customizable data directory path 
* Fixed autocomplete interaction issues 
* Add license notices and other details to the about command
* Minor bug fixes

### v3.0.0-alpha
* Improved channel locking system
* Added welcomer with random welcome messages support
* Added permission based command system [BREAKING CHANGE]
* Added config management command
* Added embed builder command
* Snippets, and some other commands now support embed schemas
* Improved automod system
* Added AntiJoin system
* Auto mute user if they were muted before and left the server
* Added debug logger for better error investigation 
* Improve the strategy of loading services
* Added repeated text filter channel exclution, spam filter exclusions will now also apply to this filter
* Added mention input parser
* Integrate with PM2 process manager
* Performance enhancements

##### Breaking Changes!!!
Some commands will now require specific permissions. Users without those permissions will not be able to run those commands.
The required permissions are given below:

Command                       |Permission(s)
------------------------------|-------------
Ban                           |`BAN_MEMBERS`
Kick                          |`KICK_MEMBERS`
Mute                          |`MODERATE_MEMBERS` (Timeout Members)
Clearing messages             |`MANAGE_MESSAGES`
Setting Channel Permissions   |`MANAGE_CHANNELS`

Users having the `ADMINISTRATOR` permission will be able to bypass these requirements. Commands not listed here are not affected in this change.