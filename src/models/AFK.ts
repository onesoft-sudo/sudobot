import { DataTypes, Model } from 'sequelize';
import DiscordClient from '../client/Client';

class AFK extends Model {}

AFK.init({
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
    },
    user: {
        type: DataTypes.STRING,
        allowNull: false
    },
    reason: {
        type: DataTypes.STRING,
        allowNull: true
    },
    mentions: {
        type: DataTypes.JSON,
        allowNull: false,
        defaultValue: []
    },
    guild_id: {
        type: DataTypes.STRING,
        allowNull: false
    },
}, {
    sequelize: DiscordClient.client.db.sequelize,
    modelName: 'AFK',
    updatedAt: false,
});

export default AFK;