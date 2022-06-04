import { DataTypes, Model } from 'sequelize';
import DiscordClient from '../client/Client';

class Punishment extends Model {}

Punishment.init({
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
    mod_id: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    guild_id: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    reason: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    type: {
        type: DataTypes.STRING,
        allowNull: false
    },
    meta: {
        type: DataTypes.JSON,
        allowNull: false,
        defaultValue: {}
    },
}, {
    sequelize: DiscordClient.client.db.sequelize,
    modelName: 'Punishment',
    updatedAt: false,
    tableName: 'punishments'
});

export default Punishment;