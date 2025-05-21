import { project, settings } from "blazebuild";

project.name = "@onesoftnet/sudobot";
project.version = "10.54.2";
project.description = "A Discord bot for moderation purposes.";
project.author = { name: "Ar Rakin", email: "rakinar2@onesoftnet.eu.org" };
project.license = "AGPL-3.0-or-later";

settings.build.metadataDirectory = ".blazebuild";
settings.build.metadataDirectoryUseNamespacing = true;
