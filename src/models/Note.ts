import { DataTypes, Model } from 'sequelize';
import DiscordClient from '../client/Client';

class Note extends Model {}

Note.init({
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
    },
    content: {
        type: DataTypes.STRING,
        allowNull: false
    },
    author: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    mod_tag: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    user_id: {
        type: DataTypes.STRING,
        allowNull: false
    },
    guild_id: {
        type: DataTypes.STRING,
        allowNull: false
    },
}, {
    sequelize: DiscordClient.client.db.sequelize,
    modelName: 'Note',
    updatedAt: false,
    tableName: 'notes'
});

export default Note;