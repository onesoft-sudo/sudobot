import { project, settings } from "blazebuild";

project.name = "@onesoftnet/blazebuild";
project.version = "2.0.0-alpha.1";
project.description = "A build tool for JavaScript/TypeScript projects.";
project.author = { name: "Ar Rakin", email: "rakinar2@onesoftnet.eu.org" };
project.license = "GPL-3.0-or-later";

settings.build.metadataDirectory = ".blazebuild";
settings.build.metadataDirectoryUseNamespacing = true;
