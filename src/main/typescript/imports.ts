import CommandManagerService from "./services/CommandManagerService";
import ConfigurationManagerService from "./services/ConfigurationManagerService";
import StartupManagerService from "./services/StartupManagerService";
import PermissionManagerService from "./services/PermissionManagerService";
import AboutCommand from "./commands/settings/AboutCommand";
import ClientReadyEventListener from "./events/client/ClientReadyEventListener";
import InteractionCreateEventListener from "./events/interaction/InteractionCreateEventListener";
import MessageCreateEventListener from "./events/message/MessageCreateEventListener";
import ShardReadyEventListener from "./events/shard/ShardReadyEventListener";



export const classes = {
	CommandManagerService,
	ConfigurationManagerService,
	StartupManagerService,
	PermissionManagerService,
	AboutCommand,
	ClientReadyEventListener,
	InteractionCreateEventListener,
	MessageCreateEventListener,
	ShardReadyEventListener,
};


export const services = {
	"@services/CommandManagerService": CommandManagerService,
	"@services/ConfigurationManagerService": ConfigurationManagerService,
	"@services/StartupManagerService": StartupManagerService,
	"@services/PermissionManagerService": PermissionManagerService,
};


export const events = {
	ClientReadyEventListener,
	InteractionCreateEventListener,
	MessageCreateEventListener,
	ShardReadyEventListener,
};


export const commands = {
	AboutCommand,
};


