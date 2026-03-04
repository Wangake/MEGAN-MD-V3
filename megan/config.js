/*
 * MEGAN-MD Configuration Loader
 * Loads from .env and merges with developer.js
 */

require('dotenv').config();
const developer = require('./developer');

const config = {
    // ==================== BOT IDENTITY (from .env) ====================
    BOT_NAME: process.env.BOT_NAME || '𝐌𝐄𝐆𝐀𝐍-𝐌𝐃',
    OWNER_NAME: process.env.OWNER_NAME || 'Wanga',
    OWNER_NUMBER: process.env.OWNER_NUMBER || '254758476795',
    PREFIX: process.env.PREFIX || '.',
    MODE: process.env.MODE || 'public',
    TIMEZONE: process.env.TIMEZONE || 'Africa/Nairobi',
    FOOTER: process.env.FOOTER || '© 𝐌𝐄𝐆𝐀𝐍-𝐌𝐃',
    
    // ==================== SUDO NUMBERS ====================
    SUDO_NUMBERS: process.env.SUDO_NUMBERS || '',
    
    // ==================== NEWSLETTER ====================
    NEWSLETTER_JID: process.env.NEWSLETTER_JID || '',
    NEWSLETTER_URL: process.env.NEWSLETTER_URL || '',
    
    // ==================== BOT MEDIA ====================
    BOT_PIC: process.env.BOT_PIC || '',
    
    // ==================== FEATURE TOGGLES ====================
    FEATURES: {
        ANTI_DELETE: process.env.ANTI_DELETE || 'indm',
        ANTI_CALL: process.env.ANTI_CALL || 'off',
        ANTI_LINK: process.env.ANTI_LINK || 'off',
        AUTO_REACT: process.env.AUTO_REACT || 'off',
        AUTO_READ: process.env.AUTO_READ || 'off',
        AUTO_BIO: process.env.AUTO_BIO || 'off',
        CHATBOT: process.env.CHATBOT || 'off',
        CHATBOT_MODE: process.env.CHATBOT_MODE || 'both'
    },
    
    // ==================== STATUS FEATURES ====================
    STATUS: {
        AUTO_VIEW: process.env.AUTO_VIEW_STATUS || 'true',
        AUTO_REACT: process.env.AUTO_REACT_STATUS || 'false',
        AUTO_REPLY: process.env.AUTO_REPLY_STATUS || 'false',
        AUTO_DOWNLOAD: process.env.AUTO_DOWNLOAD_STATUS || 'false',
        REACT_EMOJIS: process.env.STATUS_REACT_EMOJIS || '💛,❤️,💜,🤍,💙,👍,🔥',
        REPLY_TEXT: process.env.STATUS_REPLY_TEXT || '✅ Status viewed via MEGAN-MD'
    },
    
    // ==================== WELCOME/GOODBYE ====================
    WELCOME: {
        ENABLED: process.env.WELCOME_ENABLED || 'true',
        MESSAGE: process.env.WELCOME_MESSAGE || 'Hey @user welcome!',
        AUDIO: process.env.WELCOME_AUDIO || 'false'
    },
    
    GOODBYE: {
        ENABLED: process.env.GOODBYE_ENABLED || 'true',
        MESSAGE: process.env.GOODBYE_MESSAGE || 'Goodbye @user! 👋',
        AUDIO: process.env.GOODBYE_AUDIO || 'false'
    },
    
    // ==================== STICKER SETTINGS ====================
    PACK_NAME: process.env.PACK_NAME || 'MEGAN-MD',
    PACK_AUTHOR: process.env.PACK_AUTHOR || 'Wanga',
    
    // ==================== DATABASE ====================
    DATABASE: {
        URL: process.env.DATABASE_URL || './megan/database.sqlite',
        TYPE: 'sqlite'
    },
    
    // ==================== DEVELOPER (from developer.js) ====================
    DEV: developer.dev,
    SUPPORT: developer.support,
    API: developer.api,
    ADMINS: developer.admins,
    DONATE: developer.donate,
    VERSION: developer.version
};

// ==================== HELPER METHODS ====================

config.getOwnerJid = function() {
    const num = this.OWNER_NUMBER.replace(/\D/g, '');
    return `${num}@s.whatsapp.net`;
};

config.getAllOwnerJids = function() {
    const owners = new Set();
    
    // Add main owner
    if (this.OWNER_NUMBER) {
        owners.add(this.getOwnerJid());
    }
    
    // Add sudo numbers
    if (this.SUDO_NUMBERS) {
        this.SUDO_NUMBERS.split(',').forEach(num => {
            if (num.trim()) {
                owners.add(`${num.trim().replace(/\D/g, '')}@s.whatsapp.net`);
            }
        });
    }
    
    // Add hardcoded admins from developer.js
    if (this.ADMINS) {
        this.ADMINS.forEach(jid => owners.add(jid));
    }
    
    return Array.from(owners);
};

config.isOwner = function(jid) {
    if (!jid) return false;
    const owners = this.getAllOwnerJids();
    return owners.includes(jid);
};

module.exports = config;