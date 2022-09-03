# Banning Users

## Normal Ban
Use the `-ban` command to ban a user, regardless if they are in the server or not.

##### Legacy Command
```
-ban <UserID|UserMention|UserTag> [-d=DAYS] [Reason]
``` 

**Options**: 

- `-d`: Specify the how many days old messages to delete. Must be in range of 0-7. Default is - "Don't delete any".

##### Slash Command
```
/ban <User> [days] [reason]
```

##### Examples

```
-ban @Someone
-ban @Someone Spamming a lot
-ban @Someone -d 5 Spamming a lot
-ban 45643846466843
-ban 45643846466843 Spamming a lot
-ban 45643846466843 -d 7 Spamming a lot
```

## Temporary Ban
Temporarily ban users.

##### Legacy Command
```
-tempban <UserID|UserMention> <Time> [Reason]
``` 

##### Slash Command
```
/tempban <UserID> <Time> [days] [reason]
```

##### Examples

```
-tempban @Someone 1h
-tempban @Someone 30m Spamming a lot
-tempban 45643846466843 2m
-tempban 45643846466843 5d Spamming a lot
```

## Softban
Ban a user and unban immediately to remove messages from the user.

##### Legacy Command
```
-softban <UserID|UserMention> [-d=DAYS_OF_MESSAGE_DELETION] [Reason]
``` 

##### Slash Command
```
/softban <UserID> [-d=DAYS_OF_MESSAGE_DELETION] [days] [reason]
```

**Options**: 

- `-d`: Specify the how many days old messages to delete. Must be in range of 0-7. Default is `7`.

##### Examples

```
-tempban @Someone 1h
-tempban @Someone 30m Spamming a lot
-tempban 45643846466843 2m
-tempban 45643846466843 5d Spamming a lot
```

## Mass Ban
Use the `-massban` command to massban users.

##### Legacy Command
```
-massban <...UserIDs|UserMentions> [Reason]
``` 

##### Slash Command
```
/massban <...UserIDs> [days] [reason]
```

!!! note

    While using slash command, the IDs must be separated with spaces.

##### Examples

```
-massban 23626825621964 217216291276407
-massban 23626825621964 217216291276407 63876523582826865 Raiding the Server
-massban 23626825621964 217216291276407 @Someone 36362742746674467
```

## Unbanning
Use the `-unban` command to unban users.

##### Legacy Command
```
-unban <UserID>
``` 

##### Slash Command
```
/unban <UserID>
```

##### Examples

```
-unban 7485692162169
```
