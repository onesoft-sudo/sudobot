# Muting members

Use the `-mute` command to mute members. This will assign a muted role to the member and each channel is expected to have a permission override for this role which denies the `SEND_MESSAGES` permission.

**Legacy Command**

```
-mute <UserID|UserMention|UserTag> [-t=TIME] [Reason] 
```

**Slash Command**

```
/mute <Member> [Time] [Reason] [Hardmute]
```

{% hint style="info" %}
Hardmuting means not only muting but also taking out all other roles except the muted role. They'll be given back when the unmute command is run or the mute duration expires.
{% endhint %}

#### Examples

```
-mute @Someone
-mute 347382275362482
-mute @Someone Spamming
-mute @Someone -t 50m Spamming
-mute 347382275362482 -t 12h Spamming
```

## Unmuting

Use the `-unmute` command to unmute members.

**Legacy Command**

```
-unmute <UserID|UserMention|UserTag>
```

**Slash Command**

```
/unmute <Member>
```

#### Examples

```
-unmute @Someone
-unmute 5256258251685246
```
