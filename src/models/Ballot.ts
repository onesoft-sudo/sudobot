import { DataTypes, Model } from 'sequelize';
import DiscordClient from '../client/Client';

class Ballot extends Model {}

Ballot.init({
    // Model attributes are defined here
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
    },
    content: {
        type: DataTypes.STRING,
        allowNull: false
    },
    author: {
        type: DataTypes.STRING,
        allowNull: true
    },
    msg_id: {
        type: DataTypes.STRING,
        allowNull: false
    },
    channel_id: {
        type: DataTypes.STRING,
        allowNull: false
    },
    guild_id: {
        type: DataTypes.STRING,
        allowNull: false
    },
    date: {
        type: DataTypes.DATE,
        allowNull: false,
    }
}, {
    sequelize: DiscordClient.client.db.sequelize,
    modelName: 'Ballot',
    timestamps: false,
});

export default Ballot;