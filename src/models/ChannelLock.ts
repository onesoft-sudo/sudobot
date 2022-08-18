import { DataTypes, Model } from 'sequelize';
import DiscordClient from '../client/Client';

class ChannelLock extends Model {}

ChannelLock.init({
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
    },
    reason: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    user_id: {
        type: DataTypes.STRING,
        allowNull: false
    },
    guild_id: {
        type: DataTypes.STRING,
        allowNull: false
    },
    channel_id: {
        type: DataTypes.STRING,
        unique: true,
        allowNull: false
    },
    role_id: {
        type: DataTypes.STRING,
        allowNull: false
    },
    previous_perms: {
        type: DataTypes.JSON,
        allowNull: false
    }
}, {
    sequelize: DiscordClient.client.db.sequelize,
    modelName: 'ChannelLock',
    updatedAt: false,
    tableName: 'channel_lock'
});

export default ChannelLock;