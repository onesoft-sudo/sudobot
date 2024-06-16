# Contributing 

Thanks for thinking about contributing to this project!
This file contains some basic guidelines about contributions.

## Useful links
- [Issues](https://github.com/onesoft-sudo/sudobot/issues)
- [Docs](https://onesoft-sudo.github.io/sudobot/)
- [Support Email](mailto:rakinar2@onesoftnet.eu.org)

## How to report a bug 

If you've found a bug, you can create an issue on the GitHub repo. Include as much information as possible, so that we can help you as quick as possible.
Also it's best to make sure that a similar issue does not exist previously.
Please note that security issues should be reported via email only and should not be discussed in public, because that might cause more issues rather that resolving it. 

## How to submit changes

Get started by forking this repository, then cloning it locally, and finally committing your work and creating a PR. If your PR follows our contribution guidelines and standards, we will merge it. We might suggest you to make some changes to your code, in that case feel free to share your opinions and thoughts about your approaches of doing things and our suggestions.

## Commit Guidelines

We strictly follow [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/). We highly suggest that you check out the [Conventional Commit Specification](https://www.conventionalcommits.org/en/v1.0.0/#specification) if you're not familiar with it. 

The following types are currently allowed to be used in commit messages:

* `feat` - New features
* `fix` - Bug fixes
* `perf` - Performance improvements
* `ci` - CI configuration file updates (e.g. GitHub Action Workflows)
* `build` - Build system related commits (e.g. updates to the build script)
* `refactor` - Code changes that neither adds a new feature nor fixes a bug
* `style` - Code modifications that do not change the meaning of the code (e.g. formatting)
* `docs` - Documentation updates
* `test` - Unit/integration test related commits
* `revert` - A commit that reverts another commit
* `chore` - Commits that do not fit in the other types

### Partial commits

In case if you have to commit **incomplete** changes, then we recommend explicitly stating so in your commit message by appending `(x/y)` to the header of your commit message, where `x` is the number of steps you've completed, and `y` is the total amount of steps required to make the change completely functional. For example:

```
feat(automod): verification system (1/3)
```

This would mean this commit is not complete, and two more commits will be pushed later to make this feature completely functional.

> [!WARNING]  
> Do not push a partial commit in release-specific branches except for `main`. The `main` branch rapidly changes, and contains unstable changes. However, the other branches are kept as-is to keep a history of the older releases. You can also create a new branch specifically for the feature you're working on. Then when your code gets merged into the main branch, you can delete the feature branch.

### Signing-off commits

We require contributors to [Sign-off Commits](https://git-scm.com/docs/git-commit#Documentation/git-commit.txt---signoff) before they are merged/pushed into the remote branches. This is done to make sure the contributors acknowledge that the code they're submitting is theirs and they have the appropriate rights to do so. By signing-off a commit, a you explicitly agrees that:

* The code you submit is yours;
* You have the appropriate legal rights to submit the code;
* You agree to the terms and conditions of the [GNU Affero General Public License](https://gnu.org/licenses/agpl-3.0.html), and acknowledge that your code is now a part of a free software which can be seen, studied or modified by anyone over the world;

If a commit does not contain a `Signed-off-by` header, we will ask you to explicitly state that you agree to the above terms before merging your code.

## Getting Help

You can email at rakinar2@onesoftnet.eu.org.
