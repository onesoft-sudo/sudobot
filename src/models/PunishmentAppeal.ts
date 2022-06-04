import { BuildOptions, DataTypes, Model, Optional } from 'sequelize';
import DiscordClient from '../client/Client';

class PunishmentAppeal extends Model {
    
}

PunishmentAppeal.init({
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
    },
    user_id: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    guild_id: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    content: {
        type: DataTypes.TEXT,
        allowNull: false
    }
}, {
    sequelize: DiscordClient.client.db.sequelize,
    modelName: 'PunishmentAppeal',
    updatedAt: false,
    tableName: 'appeals'
});

export default PunishmentAppeal;