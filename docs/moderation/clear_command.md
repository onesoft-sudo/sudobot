# Clearing messages in bulk

Sudobot has `-clear` command which can delete messages in bulk.

!!! warning
    Messages deleted using this command won't be logged.

##### Legacy Command
```
-clear <UserID|UserMention>
```

##### Slash Command
```
/clear [User] [MessageCount] [Channel]
```

!!! note
    While using slash command, you must specify either the message count or the user.

!!! info
    This operation might take some time depending on the amount of messages.

#### Examples

```
-clear @Someone
-clear 347382275362482
```