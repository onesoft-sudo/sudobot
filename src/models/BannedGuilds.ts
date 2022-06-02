import { DataTypes, Model } from 'sequelize';
import DiscordClient from '../client/Client';

class BannedGuild extends Model {}

BannedGuild.init({
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
    },
    reason: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    guild_id: {
        type: DataTypes.STRING,
        unique: true
    }
}, {
    sequelize: DiscordClient.client.db.sequelize,
    modelName: 'BannedGuild',
    updatedAt: false,
    tableName: 'banned_guilds'
});

export default BannedGuild;