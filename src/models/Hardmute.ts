import { DataTypes, Model } from 'sequelize';
import DiscordClient from '../client/Client';

class Hardmute extends Model {}

Hardmute.init({
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
    },
    user_id: {
        type: DataTypes.STRING,
        allowNull: false
    },
    roles: {
        type: DataTypes.JSON,
        allowNull: false
    },
    guild_id: {
        type: DataTypes.STRING,
        allowNull: false
    }
}, {
    sequelize: DiscordClient.client.db.sequelize,
    modelName: 'Hardmute',
    updatedAt: false
});

export default Hardmute;