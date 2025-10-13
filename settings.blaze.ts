import { project, settings } from "@onesoftnet/blazebuild";

project.name = "@onesoftnet/sudobot";
project.version = "11.0.0";
project.description = "A Discord bot for moderation purposes.";
project.author = { name: "Ar Rakin", email: "rakinar2@onesoftnet.eu.org" };
project.license = "AGPL-3.0-or-later";

project.structure.sourceModules = ["main", "framework", "api", "schemas"];

settings.build.metadataDirectory = ".blazebuild";
settings.build.metadataDirectoryUseNamespacing = true;
