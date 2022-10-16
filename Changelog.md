# Changelog

### development 
(No change yet)

### v4.2.0
* Added private channel creation command
* Added embed builder snippet function

### v4.1.2
* Fixed profile filter interfering with manual mutes

### v4.1.1
* Fixed incomplete string escaping or encoding

### v4.1.0
* Added new welcome messages 
* Added wildcard rickroll url 

### v4.0.2
* Fixed unexpected unmute by profile filter if not muted

### v4.0.1
* Updated about command

### v4.0.0
* Added pagination to `help` command
* Changed `rolelist` command signature and syntax
* Added pagination to `rolelist` command
* Added pagination system
* Added installation/setup script for easy setup of the bot
* Changed about command embed
* Changed warn command embed color and added timestamps
* Spotify status song name is now clickable; it takes you to the song page
* Warning command now checks role position
* Added new and improved pagination system
* Upgraded the queue management system
* Fixed AFK systems not working properly (#84)
* Updated config schema

### v4.0.0-alpha1
* Fixed typo in a welcome message

### v4.0.0-alpha
* Performance Improvements
* Now Using MongoDB as Database instead of SQLite **[BREAKING CHANGE]**
* A full refactor of the API
* Dockerized the project
* Customizable data directory path 
* Fixed autocomplete interaction issues 
* Add license notices and other details to the about command
* Minor bug fixes
* Added profile filter for checking banned words/tokens in user profiles

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
