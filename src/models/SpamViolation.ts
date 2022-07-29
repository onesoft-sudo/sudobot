import { DataTypes, Model } from 'sequelize';
import DiscordClient from '../client/Client';

class SpamViolation extends Model {}

SpamViolation.init({
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
    },
    user_id: {
        type: DataTypes.STRING,
        allowNull: false
    },
    guild_id: {
        type: DataTypes.STRING,
        allowNull: false
    },
    strike: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 1
    }
}, {
    sequelize: DiscordClient.client.db.sequelize,
    modelName: 'SpamViolation',
    updatedAt: false,
    tableName: 'spam_violation'
});

export default SpamViolation;