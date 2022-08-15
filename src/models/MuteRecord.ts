import { DataTypes, Model } from 'sequelize';
import DiscordClient from '../client/Client';

class MuteRecord extends Model {}

MuteRecord.init({
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
    },
    user_id: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true
    },
    guild_id: {
        type: DataTypes.STRING,
        allowNull: false
    }
}, {
    sequelize: DiscordClient.client.db.sequelize,
    modelName: 'MuteRecord',
    updatedAt: false
});

export default MuteRecord;