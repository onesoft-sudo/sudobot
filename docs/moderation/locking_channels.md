# Locking Channels

You can lock channels using `-lock` command. This sets a permission override to the target channel that denies `SEND_MESSAGES` permission for `@everyone` role.

{% hint style="warning" %}
If other roles have `SEND_MESSAGES` permission allowed then members having them could bypass the channel lock. You should take care about this.
{% endhint %}

**Legacy Command**

```
-lock [ChannelID|ChannelMention]
```

**Slash Command**

```
/lock [Channel]
```

{% hint style="info" %}
If the channel is not specified then the system will lock the current channel.
{% endhint %}

#### Examples

```
-lock
-lock 347382275362482
-lock #general
```

## Locking Channels in Bulk

**Legacy Command**

```
-lockall <...ChannelIDs|ChannelMentions> [--raid]
```

**Slash Command**

```
/lockall <...ChannelIDs> [Role] [Raid]
```

* `Role`: The channel will be locked for this role. Defaults to `@everyone`.
* `Raid`, `--raid`: Select and lock all Raid-protected channels.

#### Examples

```
-lockall --raid
-lockall 347382275362482
-lockall #general
```

## Unlocking Channels

You can unlock channels back using `-unlock` command. This sets a permission override to the target channel that reverts the `SEND_MESSAGES` permission for `@everyone` role as it was before.

**Legacy Command**

```
-unlock [ChannelID|ChannelMention]
```

**Slash Command**

```
/unlock [Channel]
```

{% hint style="info" %}
If the channel is not specified then the system will unlock the current channel.
{% endhint %}

#### Examples

```
-unlock
-unlock 347382275362482
-unlock #general
```

## Unlocking Channels in Bulk

**Legacy Command**

```
-unlockall <...ChannelIDs|ChannelMentions> [--raid]
```

**Slash Command**

```
/unlockall <...Channels> [Role] [Raid]
```

* `Role`: The channel will be unlocked for this role. Defaults to `@everyone`.
* `Raid`, `--raid`: Select and unlock all Raid-protected channels.

#### Examples

```
-unlockall --raid
-unlockall 347382275362482
-unlockall #general
```
