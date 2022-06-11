import { DataTypes, Model } from 'sequelize';
import DiscordClient from '../client/Client';

class UnverifiedMember extends Model {}

UnverifiedMember.init({
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
    },
    user_id: {
        type: DataTypes.STRING,
        allowNull: true
    },
    guild_id: {
        type: DataTypes.STRING,
        allowNull: false
    },
    status: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: 'pending'
    },
}, {
    sequelize: DiscordClient.client.db.sequelize,
    modelName: 'UnverifiedMember',
    tableName: 'unverified_members',
    updatedAt: false,
});

export default UnverifiedMember;