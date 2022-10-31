#!/bin/node

/**
* This file is part of SudoBot.
* 
* Copyright (C) 2021-2022 OSN Inc.
*
* SudoBot is free software; you can redistribute it and/or modify it
* under the terms of the GNU Affero General Public License as published by 
* the Free Software Foundation, either version 3 of the License, or
* (at your option) any later version.
* 
* SudoBot is distributed in the hope that it will be useful, but
* WITHOUT ANY WARRANTY; without even the implied warranty of 
* MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the 
* GNU Affero General Public License for more details.
*
* You should have received a copy of the GNU Affero General Public License 
* along with SudoBot. If not, see <https://www.gnu.org/licenses/>.
*/

const { SlashCommandBuilder, ContextMenuCommandBuilder } = require('@discordjs/builders');
const { REST } = require('@discordjs/rest');
const { Routes } = require('discord-api-types/v9');
const { config } = require('dotenv');
const { existsSync } = require('fs');
const path = require('path');
const { ApplicationCommandType } = require('discord-api-types/v10');

if (existsSync(path.join(__dirname, '.env'))) {
    config();
}
else {
    process.env.ENV = 'prod';
}

const { CLIENT_ID, GUILD_ID, TOKEN } = process.env;

let commands = [
	// SETTINGS
	new SlashCommandBuilder().setName('help').setDescription('A short documentation about the commands')
		.addStringOption(option => option.setName('command').setDescription("The command")),
	new SlashCommandBuilder().setName('about').setDescription('Show information about the bot'),
	new SlashCommandBuilder().setName('eval').setDescription('Execute raw code in the runtime environment')
		.addStringOption(option => option.setName('code').setDescription('The code to be executed').setRequired(true)),
	new SlashCommandBuilder().setName('system').setDescription('Show the system status'),
	new SlashCommandBuilder().setName('restart').setDescription('Restart the system'),
	new SlashCommandBuilder().setName('setstatus').setDescription('Set status for the bot system')
		.addStringOption(option => option.setName('activity').setDescription('The activity').setRequired(true))
		.addStringOption(option => option.setName('status').setDescription('The status').setChoices(...[
			{
				name: 'Online',
				value: 'online'
			},
			{
				name: 'Idle',
				value: 'idle'
			},
			{
				name: 'DND',
				value: 'dnd'
			},
			{
				name: 'Invisible',
				value: 'invisible'
			}
		]))
		.addStringOption(option => option.setName('type').setDescription('The activity type').setChoices(...[
			{
				name: 'Playing',
				value: 'PLAYING'
			},
			{
				name: 'Watching',
				value: 'WATCHING'
			},
			{
				name: 'Competing',
				value: 'COMPETING'
			}
		])),
	new SlashCommandBuilder().setName('config').setDescription('View/change the system settings for this server')
		.addStringOption(option => option.setName('key').setDescription('The setting key (e.g. spam_filter.enabled)').setRequired(true).setAutocomplete(true))
		.addStringOption(option => option.setName('value').setDescription('New value for the setting')),

	// INFORMATION
	new SlashCommandBuilder().setName('stats').setDescription('Show the server statistics'),
	new SlashCommandBuilder().setName('lookup').setDescription('Lookup something')
		.addSubcommand(subcommand => subcommand.setName("user").setDescription("User lookup")
			.addUserOption(option => option.setName("user").setDescription("The user to search").setRequired(true))	
			)
			.addSubcommand(subcommand => subcommand.setName("guild").setDescription("Server/Guild lookup")
				.addStringOption(option => option.setName("guild_id").setDescription("The ID of the server/guild to lookup").setRequired(true))	
			)
			.addSubcommand(subcommand => subcommand.setName("avatar").setDescription("Avatar lookup using Google Image Search")
				.addUserOption(option => option.setName("user").setDescription("The user to lookup").setRequired(true))	
			),

	new SlashCommandBuilder().setName('profile').setDescription('Show someone\'s profile')
		.addUserOption(option => option.setName('user').setDescription('The user')),
	new SlashCommandBuilder().setName('avatar').setDescription('Show someone\'s avatar')
		.addUserOption(option => option.setName('user').setDescription('The user')),
	new SlashCommandBuilder().setName('rolelist').setDescription('List all roles or show info about a role')
		.addRoleOption(option => option.setName('role').setDescription('The role'))
		.addStringOption(option => 
			option
			.setName('order')
			.setDescription('Order style of the list (according to the role positions)')
			.setChoices({
				name: "Ascending",
				value: "a"
			}, {
				name: "Descending",
				value: "d"
			})
		),

	// AUTOMATION
	new SlashCommandBuilder().setName('ballot').setDescription('Ballot engine')
		.addSubcommand(subcommand =>
			subcommand
				.setName('create')
				.setDescription('Send a ballot/poll message for collecting votes')
				.addStringOption(option => option.setName('content').setDescription('Message content').setRequired(true))
				.addBooleanOption(option => option.setName('anonymous').setDescription('If this is set to true then the syetem won\'t show your username'))
				.addChannelOption(option => option.setName('channel').setDescription('The channel where the message should be sent')))
		.addSubcommand(subcommand =>
			subcommand
				.setName('view')
				.setDescription('Get information/stats about a ballot')
				.addStringOption(option => option.setName('id').setDescription('The ballot ID'))),
		
	new SlashCommandBuilder().setName('embed').setDescription('Make an embed')
		.addSubcommand(subcmd => 
		     subcmd.setName("send").setDescription("Make and send an embed")
				.addStringOption(option => option.setName('author_name').setDescription('The embed author name'))
				.addStringOption(option => option.setName('author_iconurl').setDescription('The embed author icon URL'))
				.addStringOption(option => option.setName('title').setDescription('The embed title'))
				.addStringOption(option => option.setName('description').setDescription('The embed description'))
				.addStringOption(option => option.setName('thumbnail').setDescription('The embed thumbnail URL'))
				.addStringOption(option => option.setName('image').setDescription('The embed image attachment URL'))
				.addStringOption(option => option.setName('video').setDescription('The embed video attachment URL'))
				.addStringOption(option => option.setName('footer_text').setDescription('The embed footer text'))
				.addStringOption(option => option.setName('footer_iconurl').setDescription('The embed footer icon URL'))
				.addStringOption(option => option.setName('timestamp').setDescription('The embed timestamp, use \'current\' to set current date'))
				.addStringOption(option => option.setName('color').setDescription('The embed color (default is #007bff)'))
				.addStringOption(option => option.setName('url').setDescription('The embed URL'))
				.addStringOption(option => option.setName('fields').setDescription('The embed fields, should be in `Field 1: Value 1, Field 2: Value 2` format'))
		)
		.addSubcommand(subcmd => 
		     subcmd.setName("schema").setDescription("Make and send an embed schema representation")
				.addStringOption(option => option.setName('author_name').setDescription('The embed author name'))
				.addStringOption(option => option.setName('author_iconurl').setDescription('The embed author icon URL'))
				.addStringOption(option => option.setName('title').setDescription('The embed title'))
				.addStringOption(option => option.setName('description').setDescription('The embed description'))
				.addStringOption(option => option.setName('thumbnail').setDescription('The embed thumbnail URL'))
				.addStringOption(option => option.setName('image').setDescription('The embed image attachment URL'))
				.addStringOption(option => option.setName('video').setDescription('The embed video attachment URL'))
				.addStringOption(option => option.setName('footer_text').setDescription('The embed footer text'))
				.addStringOption(option => option.setName('footer_iconurl').setDescription('The embed footer icon URL'))
				.addStringOption(option => option.setName('timestamp').setDescription('The embed timestamp, use \'current\' to set current date'))
				.addStringOption(option => option.setName('color').setDescription('The embed color (default is #007bff)'))
				.addStringOption(option => option.setName('url').setDescription('The embed URL'))
				.addStringOption(option => option.setName('fields').setDescription('The embed fields, should be in `Field 1: Value 1, Field 2: Value 2` format'))
		)
		.addSubcommand(subcmd => 
		     subcmd.setName("build").setDescription("Build an embed from schema")
				.addStringOption(option => option.setName('json_schema').setDescription('The embed JSON schema'))
		),

	new SlashCommandBuilder().setName('queues').setDescription('List all queued jobs'),

	new SlashCommandBuilder().setName('schedule').setDescription('Schedule a message for sending later')
		.addStringOption(option => option.setName('time').setDescription('The time interval').setRequired(true))
		.addStringOption(option => option.setName('content').setDescription('Message content').setRequired(true))
		.addChannelOption(option => option.setName('channel').setDescription('The channel where the message should be sent')),

	new SlashCommandBuilder().setName('expire').setDescription('Expire (delete) a message after a certain amount of time')
		.addStringOption(option => option.setName('time').setDescription('The time interval').setRequired(true))
		.addStringOption(option => option.setName('content').setDescription('Message content').setRequired(true))
		.addChannelOption(option => option.setName('channel').setDescription('The channel where the message should be sent')),

	new SlashCommandBuilder().setName('expiresc').setDescription('Schedule and expire (delete) a message after a certain amount of time')
		.addStringOption(option => option.setName('send-after').setDescription('The time after the message should be sent').setRequired(true))
		.addStringOption(option => option.setName('delete-after').setDescription('The time after the message should be deleted').setRequired(true)) // (the system will start counting this after the message gets sent)
		.addStringOption(option => option.setName('content').setDescription('Message content').setRequired(true))
		.addChannelOption(option => option.setName('channel').setDescription('The channel where the message should be sent')),

	// FUN
	new SlashCommandBuilder().setName('cat').setDescription('Fetch a random kitty image'),

	new SlashCommandBuilder().setName('dog').setDescription('Fetch a random doggy image'),

	new SlashCommandBuilder().setName('joke').setDescription('Fetch a random joke from the Joke API'),

	new SlashCommandBuilder().setName('httpcat').setDescription('Fetch a funny cat meme associated with an HTTP status code')
		.addIntegerOption(option => option.setName('status').setDescription('The HTTP status Code').setRequired(true).setMinValue(100).setMaxValue(599)),

	new SlashCommandBuilder().setName('httpdog').setDescription('Fetch a funny dog meme associated with an HTTP status code')
		.addIntegerOption(option => option.setName('status').setDescription('The HTTP status Code').setRequired(true).setMinValue(100).setMaxValue(599)),
		
	new SlashCommandBuilder().setName('pixabay').setDescription('Search & fetch images from the Pixabay API')
		.addSubcommand(subcommand =>
			subcommand
				.setName('image')
				.setDescription('Get any type of image')
				.addStringOption(option => option.setName('query').setDescription('Search query')))
		.addSubcommand(subcommand =>
			subcommand
				.setName('photo')
				.setDescription('Get photos')
				.addStringOption(option => option.setName('query').setDescription('Search query')))
		.addSubcommand(subcommand =>
			subcommand
				.setName('illustration')
				.setDescription('Get illustrations')
				.addStringOption(option => option.setName('query').setDescription('Search query')))
		.addSubcommand(subcommand =>
			subcommand
				.setName('vector')
				.setDescription('Get vectors')
				.addStringOption(option => option.setName('query').setDescription('Search query'))),

	// UTILS
	new SlashCommandBuilder().setName('snippet').setDescription('Snippets are instant custom messages')
		.addSubcommand(subcommand =>
			subcommand
				.setName('get')
				.setDescription('Get a snippet')
				.addStringOption(option => option.setName('name').setDescription('The snippet name').setRequired(true)))
		.addSubcommand(subcommand =>
			subcommand
				.setName('create')
				.setDescription('Create a snippet')
				.addStringOption(option => option.setName('name').setDescription('The snippet name').setRequired(true))
				.addStringOption(option => option.setName('content').setDescription('Snippet message content').setRequired(true))
				.addAttachmentOption(option => option.setName('file').setDescription('Snippet message file')))
		.addSubcommand(subcommand =>
			subcommand
				.setName('rename')
				.setDescription('Rename a snippet')
				.addStringOption(option => option.setName('old-name').setDescription('The old snippet name').setRequired(true))
				.addStringOption(option => option.setName('new-name').setDescription('The new name').setRequired(true)))
		.addSubcommand(subcommand =>
			subcommand
				.setName('delete')
				.setDescription('Delete a snippet')
				.addStringOption(option => option.setName('name').setDescription('The snippet name').setRequired(true))),
	
	new SlashCommandBuilder().setName('afk').setDescription('Set your AFK status')
		.addStringOption(option => option.setName('reason').setDescription("The reason for going AFK")),
	
	new SlashCommandBuilder().setName('private').setDescription('Create a private channel for specific members')
		.addUserOption(option => option.setName('member').setDescription("The member to add in the private channel").setRequired(true))
		.addChannelOption(option => option.setName('category').setDescription("Create channel in the specified category")),
	
	new SlashCommandBuilder().setName('hash').setDescription('Generate hash for a string (text) data')
		.addStringOption(option => option.setName('content').setDescription("The content to be hashed").setRequired(true))
		.addStringOption(option => 
			option
			.setName('algorithm')
			.setDescription("Hash algorithm")
			.setChoices(
				{
					name: 'SHA1',
					value: 'sha1'
				},
				{
					name: 'SHA256',
					value: 'sha256'
				},
				{
					name: 'SHA512',
					value: 'sha512'
				},
				{
					name: 'MD5',
					value: 'md5'
				},
			)
		)
		.addStringOption(option => 
			option
			.setName('digest')
			.setDescription("Digest mode")
			.setChoices(
				{
					name: 'HEX',
					value: 'hex'
				},
				{
					name: 'Base64',
					value: 'base64'
				},
				{
					name: 'Base64 URL',
					value: 'base64url'
				},
			)
		),
	
	new SlashCommandBuilder().setName('announce').setDescription('Announce something')
		.addStringOption(option => option.setName('content').setDescription("The announcemnt message content")),

	// MODERATION
	new SlashCommandBuilder().setName('antijoin').setDescription('Enable antijoin system which will kick any new users joining the server'),

	new SlashCommandBuilder().setName('ban').setDescription('Ban a user')
		.addUserOption(option => option.setName('user').setDescription("The user").setRequired(true))
		.addStringOption(option => option.setName('reason').setDescription("The reason for banning this user"))
		.addIntegerOption(option => option.setName('days').setDescription("The days old messages to delete of this user").setMinValue(0).setMaxValue(7)),

	new SlashCommandBuilder().setName('softban').setDescription('Softban a user')
		.addUserOption(option => option.setName('user').setDescription("The user").setRequired(true))
		.addStringOption(option => option.setName('reason').setDescription("The reason for softbanning this user"))
		.addIntegerOption(option => option.setName('days').setDescription("The days old messages to delete of this user (default is 7)").setMinValue(0).setMaxValue(7)),

	new SlashCommandBuilder().setName('tempban').setDescription('Temporarily ban a user')
		.addUserOption(option => option.setName('user').setDescription("The user").setRequired(true))
		.addStringOption(option => option.setName('time').setDescription("TBan duration").setRequired(true))
		.addStringOption(option => option.setName('reason').setDescription("The reason for softbanning this user"))
		.addIntegerOption(option => option.setName('days').setDescription("The days old messages to delete of this user (default is 7)").setMinValue(0).setMaxValue(7)),

	new SlashCommandBuilder().setName('massban').setDescription('Ban multiple users')
		.addStringOption(option => option.setName('users').setDescription("The user IDs (separated by spaces)").setRequired(true))
		.addStringOption(option => option.setName('reason').setDescription("The reason for banning"))
		.addIntegerOption(option => option.setName('days').setDescription("The days old messages to delete of these users").setMinValue(0).setMaxValue(7)),

	new SlashCommandBuilder().setName('kick').setDescription('Kick a member')
		.addUserOption(option => option.setName('member').setDescription("The member").setRequired(true))
		.addStringOption(option => option.setName('reason').setDescription("The reason for kicking this user")),

	new SlashCommandBuilder().setName('shot').setDescription('Give a shot to a member')
		.addUserOption(option => option.setName('member').setDescription("The member").setRequired(true))
		.addStringOption(option => option.setName('reason').setDescription("The reason for giving shot to this user"))
		.addBooleanOption(option => option.setName('anonymous').setDescription("Prevents sending your name as the 'Doctor' of the shot")),

	new SlashCommandBuilder().setName('warn').setDescription('Warn a member')
		.addUserOption(option => option.setName('member').setDescription("The member").setRequired(true))
		.addStringOption(option => option.setName('reason').setDescription("The reason for warning this user")),

	new SlashCommandBuilder().setName('note').setDescription('Take a note for a user')
		.addUserOption(option => option.setName('user').setDescription("The user").setRequired(true))
		.addStringOption(option => option.setName('note').setDescription("The note content").setRequired(true)),

	new SlashCommandBuilder().setName('mute').setDescription('Mute a member')
		.addUserOption(option => option.setName('member').setDescription("The member").setRequired(true))
		.addStringOption(option => option.setName('reason').setDescription("The reason for muting this user"))
		.addStringOption(option => option.setName('time').setDescription("Mute duration"))
		.addBooleanOption(option => option.setName('hardmute').setDescription("Specify if the system should take out all roles of the user during the mute")),

	new SlashCommandBuilder().setName('unmute').setDescription('Unmute a member')
		.addUserOption(option => option.setName('member').setDescription("The member").setRequired(true)),

	new SlashCommandBuilder().setName('unban').setDescription('Unban a user')
		.addUserOption(option => option.setName('user').setDescription("The user").setRequired(true)),

	new SlashCommandBuilder().setName('warning').setDescription('Clear, remove or view warnings')
		.addSubcommand(subcmd => {
			return subcmd.setName('view').setDescription('View information about a warning').addStringOption(option => option.setName('id').setDescription("The warning ID").setRequired(true));
		})
		.addSubcommand(subcmd => {
			return subcmd.setName('remove').setDescription('Remove a warning').addStringOption(option => option.setName('id').setDescription("The warning ID").setRequired(true));
		})
		.addSubcommand(subcmd => {
			return subcmd.setName('list').setDescription('List warnings for a user').addUserOption(option => option.setName('user').setDescription("The user").setRequired(true));
		})
		.addSubcommand(subcmd => {
			return subcmd.setName('clear').setDescription('Clear all warnings for a user').addUserOption(option => option.setName('user').setDescription("The user").setRequired(true));
		}),

	new SlashCommandBuilder().setName('noteget').setDescription('Get information about a note')
		.addNumberOption(option => option.setName('id').setDescription("The note ID").setRequired(true)),

	new SlashCommandBuilder().setName('notedel').setDescription('Delete a note')
		.addNumberOption(option => option.setName('id').setDescription("The note ID").setRequired(true)),

	new SlashCommandBuilder().setName('notes').setDescription('Fetch all notes for a user')
		.addUserOption(option => option.setName('user').setDescription("The user").setRequired(true)),

	new SlashCommandBuilder().setName('history').setDescription('Fetch all moderation history for a user')
		.addUserOption(option => option.setName('user').setDescription("The user").setRequired(true)),

	new SlashCommandBuilder().setName('reply').setDescription('Reply to someone\'s message')
		.addStringOption(option => option.setName('message_id').setDescription("The message ID").setRequired(true))
		.addStringOption(option => option.setName('content').setDescription("The message content").setRequired(true))
		.addChannelOption(option => option.setName('channel').setDescription("The channel where the bot should make reply, defaults to current channel").setRequired(false)),

	new SlashCommandBuilder().setName('clear').setDescription('Clear messages in bulk')
		.addUserOption(option => option.setName('user').setDescription("The user"))
		.addIntegerOption(option => option.setName('count').setDescription("The amount of messages to delete").setMaxValue(400).setMinValue(0))
		.addChannelOption(option => option.setName('channel').setDescription("The channel where the messages will be deleted")),

	new SlashCommandBuilder().setName('echo').setDescription('Re-send a message from the bot system')
		.addStringOption(option => option.setName('content').setDescription("The message content").setRequired(true))
		.addChannelOption(option => option.setName('channel').setDescription("The channel where the message should be sent")),

	new SlashCommandBuilder().setName('lock').setDescription('Lock a channel')
		.addRoleOption(option => option.setName('role').setDescription("Lock channel for the given role. Default is @everyone"))
		.addChannelOption(option => option.setName('channel').setDescription("The channel that will be locked. Default is the current channel")),

	new SlashCommandBuilder().setName('setchperms').setDescription('Set permissions for channels')
		.addChannelOption(option => option.setName('channel').setDescription("The channel that (or its children) will be updated").setRequired(true))
		.addRoleOption(option => option.setName('role').setDescription("Lock channel for the given role.").setRequired(true))
		.addStringOption(option => option.setName('permission').setDescription("The permission codename").setRequired(true).setAutocomplete(true))
		.addStringOption(option => option.setName('value').setDescription("The permission value").addChoices(...[
			{
				name: 'Allow',
				value: 'true'
			},
			{
				name: 'Deny',
				value: 'false',
			},
			{
				name: 'Default',
				value: 'null',
			}
		]).setRequired(true)),

	new SlashCommandBuilder().setName('lockall').setDescription('Lock multiple channels')
		.addStringOption(option => option.setName('channels').setDescription("The channels, must be separated by spaces"))
		.addRoleOption(option => option.setName('role').setDescription("Lock channels for the given role. Default is @everyone"))
		.addBooleanOption(option => option.setName('raid').setDescription("The raid protected channels will be locked. Default is `false`")),

	new SlashCommandBuilder().setName('unlockall').setDescription('Unlock multiple channels')
		.addStringOption(option => option.setName('channels').setDescription("The channels, must be separated by spaces"))
		.addRoleOption(option => option.setName('role').setDescription("Unlock channels for the given role. Default is @everyone"))
		.addBooleanOption(option => option.setName('force').setDescription("Force set the channel permissions to `true`"))
		.addBooleanOption(option => option.setName('raid').setDescription("The raid protected channels will be unlocked. Default is `false`")),

	new SlashCommandBuilder().setName('unlock').setDescription('Unlock a channel')
		.addRoleOption(option => option.setName('role').setDescription("Unlock channel for the given role. Default is @everyone"))
		.addBooleanOption(option => option.setName('force').setDescription("Force set the channel permission to `true`"))
		.addChannelOption(option => option.setName('channel').setDescription("The channel that will be unlocked. Default is the current channel")),

	new SlashCommandBuilder().setName('send').setDescription('Send a DM to a user')
		.addStringOption(option => option.setName('content').setDescription("The message content").setRequired(true))
		.addUserOption(option => option.setName('member').setDescription("The member").setRequired(true)),


	new SlashCommandBuilder().setName('appeal').setDescription('Send us a messages about a punishment appeal')
].map(command => command.toJSON());

let contextMenuCommands = [
	new ContextMenuCommandBuilder().setName('Moderation History').setType(ApplicationCommandType.User),
	new ContextMenuCommandBuilder().setName('Ban').setType(ApplicationCommandType.User),
	new ContextMenuCommandBuilder().setName('Shot').setType(ApplicationCommandType.User),
	new ContextMenuCommandBuilder().setName('Kick').setType(ApplicationCommandType.User),
	new ContextMenuCommandBuilder().setName('Save Message').setType(ApplicationCommandType.Message),
	new ContextMenuCommandBuilder().setName('Send Reply').setType(ApplicationCommandType.Message),
].map(command => command.toJSON());

commands = commands.concat(contextMenuCommands);

if (process.argv.includes('--clear')) {
	commands = [];
	contextMenuCommands = [];
}

const rest = new REST({ version: '9' }).setToken(TOKEN);

rest.put(Routes[process.argv.includes('--guild') ? 'applicationGuildCommands' : 'applicationCommands'](CLIENT_ID, GUILD_ID), { body: commands })
	.then(() => console.log('Successfully registered application ' + (process.argv.includes('--guild') ? 'guild ' : '') + 'commands.'))
	.catch(console.error);
