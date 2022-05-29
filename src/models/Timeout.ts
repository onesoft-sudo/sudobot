import { DataTypes, Model } from 'sequelize';
import DiscordClient from '../client/Client';

class Timeout extends Model {}

Timeout.init({
    // Model attributes are defined here
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
    },
    time: {
        type: DataTypes.STRING,
        allowNull: false
    },
    filePath: {
        type: DataTypes.STRING,
        allowNull: false
    },
    params: {
        type: DataTypes.STRING,
        allowNull: false
    },
    guild_id: {
        type: DataTypes.STRING,
        allowNull: false
    },
    cmd: {
        type: DataTypes.STRING,
        allowNull: false,
    }
}, {
    sequelize: DiscordClient.client.db.sequelize,
    modelName: 'Timeout',
    createdAt: 'created_at',
    updatedAt: false
});

export default Timeout;