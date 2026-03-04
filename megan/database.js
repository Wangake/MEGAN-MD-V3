/*
 * MEGAN-MD Database
 * Sequelize with SQLite
 */

const { Sequelize, DataTypes } = require('sequelize');
const config = require('./config');

const sequelize = new Sequelize({
    dialect: 'sqlite',
    storage: config.DATABASE.URL,
    logging: false
});

// Define models
const User = sequelize.define('User', {
    jid: { type: DataTypes.STRING, unique: true },
    warns: { type: DataTypes.INTEGER, defaultValue: 0 },
    banned: { type: DataTypes.BOOLEAN, defaultValue: false },
    premium: { type: DataTypes.BOOLEAN, defaultValue: false },
    commandCount: { type: DataTypes.INTEGER, defaultValue: 0 }
});

const Group = sequelize.define('Group', {
    jid: { type: DataTypes.STRING, unique: true },
    name: { type: DataTypes.STRING },
    welcome: { type: DataTypes.BOOLEAN, defaultValue: true },
    goodbye: { type: DataTypes.BOOLEAN, defaultValue: true },
    antilink: { type: DataTypes.STRING, defaultValue: 'off' }
});

const Setting = sequelize.define('Setting', {
    key: { type: DataTypes.STRING, unique: true },
    value: { type: DataTypes.TEXT }
});

// Sync database
async function initDatabase() {
    try {
        await sequelize.authenticate();
        await sequelize.sync({ alter: true });
        console.log('✅ Database connected');
    } catch (err) {
        console.error('❌ Database error:', err.message);
    }
}

module.exports = {
    sequelize,
    User,
    Group,
    Setting,
    initDatabase
};