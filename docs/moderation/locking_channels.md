# Locking Channels

You can lock channels using `-lock` command. This sets a permission override to the target channel that denies `SEND_MESSAGES` permission for `@everyone` role.

!!! warning
    If other roles have `SEND_MESSAGES` permission allowed then members having them could bypass the channel lock. You should take care about this.

##### Legacy Command
```
-lock [ChannelID|ChannelMention]
```

##### Slash Command
```
/lock [Channel]
```

!!! note
    If the channel is not specified then the system will lock the current channel.

#### Examples

```
-lock
-lock 347382275362482
-lock #general
```

## Unlocking Channels

You can unlock channels back using `-unlock` command. This sets a permission override to the target channel that reverts the `SEND_MESSAGES` permission for `@everyone` role as it was before.

##### Legacy Command
```
-unlock [ChannelID|ChannelMention]
```

##### Slash Command
```
/unlock [Channel]
```

!!! note
    If the channel is not specified then the system will unlock the current channel.

#### Examples

```
-unlock
-unlock 347382275362482
-unlock #general
```