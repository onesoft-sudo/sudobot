# Taking notes for a user

**Legacy Command**

```
-note <UserID|UserMention|UserTag> <...NoteContent>
```

**Slash Command**

```
/note <User> <Content>
```

#### Examples

```
-note @Someone Something to note...
-note 347382275362482 Something to note...
```

## Viewing notes

**Legacy Command**

```
-noteget <NoteID>
```

**Slash Command**

```
/noteget <NoteID>
```

{% hint style="info" %}
Note IDs are shown when you create them. Also, running `-notes` command will list all notes for a user with their IDs.
{% endhint %}

#### Examples

```
-noteget 3
```

## Viewing all notes for a user

**Legacy Command**

```
-notes <UserID|UserMention|UserTag>
```

**Slash Command**

```
/notes <User>
```

#### Examples

```
-notes @Someone
-notes 72926658752652945
```

## Deleting notes

**Legacy Command**

```
-notedel <NoteID>
```

**Slash Command**

```
/notedel <NoteID>
```

#### Examples

```
-notedel 3
```
