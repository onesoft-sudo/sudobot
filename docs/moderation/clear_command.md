# Clearing messages in bulk

Sudobot has `-clear` command which can delete messages in bulk.

{% hint style="warning" %}
Messages deleted using this command won't be logged.
{% endhint %}

**Legacy Command**

```
-clear <UserID|UserMention>
```

**Slash Command**

```
/clear [User] [MessageCount] [Channel]
```

{% hint style="warning" %}
While using slash command, you must specify either the message count or the user.
{% endhint %}

{% hint style="info" %}
This operation might take some time depending on the amount of messages.
{% endhint %}

#### Examples

```
-clear @Someone
-clear 347382275362482
```
