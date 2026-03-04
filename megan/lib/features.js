/*
 * MEGAN-MD Auto Features
 */

const { downloadMediaMessage } = require('gifted-baileys');
const config = require('../config');
const Helpers = require('./helpers');

class Features {
    constructor(bot) {
        this.bot = bot;
        this.sock = bot.sock;
        this.logger = bot.logger;
        
        // 200+ emojis for auto-react
        this.emojis = [
            '❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '💔', '❤️‍🔥',
            '💕', '💞', '💓', '💗', '💖', '💘', '💝', '💟', '😊', '😇',
            '🙂', '😉', '😍', '🥰', '😘', '😗', '😙', '😚', '😋', '😛',
            '😝', '😜', '🤪', '🤨', '🧐', '🤓', '😎', '🥳', '😏', '😒',
            '😞', '😔', '😟', '😕', '🙁', '☹️', '😣', '😖', '😫', '😩',
            '🥺', '😢', '😭', '😤', '😠', '😡', '🤬', '🤯', '😳', '🥵',
            '🥶', '😱', '😨', '😰', '😥', '😓', '🤗', '🤔', '🤭', '🤫',
            '🤥', '😶', '😐', '😑', '😬', '🙄', '😯', '😦', '😧', '😲',
            '👍', '👎', '👌', '✌️', '🤞', '🤟', '🤘', '🤙', '👈', '👉',
            '👆', '👇', '☝️', '👋', '🤚', '🖐️', '✋', '👏', '🙌', '👐',
            '🤲', '🤝', '🙏', '💪', '🔥', '✨', '⭐', '🌟', '💫', '⚡',
            '💥', '💯', '✅', '❌', '❎', '➕', '➖', '➗', '✖️', '💲',
            '🔴', '🟠', '🟡', '🟢', '🔵', '🟣', '🟤', '⚫', '⚪', '🔘'
        ];
    }
    
    // ==================== AUTO REACT ====================
    async autoReact(msg) {
        if (config.FEATURES.AUTO_REACT !== 'true') return;
        if (msg.key.fromMe) return;
        if (msg.key.remoteJid === 'status@broadcast') return;
        
        const emoji = Helpers.randomItem(this.emojis);
        
        setTimeout(async () => {
            try {
                await this.sock.sendMessage(msg.key.remoteJid, {
                    react: { key: msg.key, text: emoji }
                });
            } catch (e) {}
        }, 1000 + Math.random() * 2000);
    }
    
    // ==================== AUTO READ ====================
    async autoRead(msg) {
        if (config.FEATURES.AUTO_READ !== 'true') return;
        if (msg.key.fromMe) return;
        if (msg.key.remoteJid === 'status@broadcast') return;
        
        try {
            await this.sock.readMessages([msg.key]);
        } catch (e) {}
    }
    
    // ==================== ANTI LINK ====================
    async antiLink(msg, from, sender) {
        if (config.FEATURES.ANTI_LINK === 'off') return false;
        if (!from.endsWith('@g.us')) return false;
        
        const text = Helpers.extractText(msg.message);
        if (!text || !Helpers.isUrl(text)) return false;
        
        try {
            // Check if sender is admin
            const metadata = await this.sock.groupMetadata(from);
            const isAdmin = metadata.participants.some(p => 
                p.id === sender && (p.admin === 'admin' || p.admin === 'superadmin')
            );
            
            if (isAdmin) return false;
            
            // Delete message
            await this.sock.sendMessage(from, { delete: msg.key });
            
            if (config.FEATURES.ANTI_LINK === 'kick') {
                await this.sock.groupParticipantsUpdate(from, [sender], 'remove');
                await this.sock.sendMessage(from, {
                    text: `⚠️ @${sender.split('@')[0]} kicked for sending a link!`,
                    mentions: [sender]
                });
            } else {
                await this.sock.sendMessage(from, {
                    text: `⚠️ @${sender.split('@')[0]} Links are not allowed!`,
                    mentions: [sender]
                });
            }
            
            return true;
        } catch (e) {
            return false;
        }
    }
    
    // ==================== ANTI DELETE ====================
    async antiDelete(deletedMsg, key, deleter, sender) {
        if (config.FEATURES.ANTI_DELETE === 'off') return;
        
        const destination = config.FEATURES.ANTI_DELETE === 'inchat' 
            ? key.remoteJid 
            : config.getOwnerJid();
        
        const text = Helpers.extractText(deletedMsg.message);
        const mediaType = Helpers.getMediaType(deletedMsg.message);
        
        if (text) {
            await this.sock.sendMessage(destination, {
                text: `🚨 *DELETED MESSAGE*\n\n` +
                      `👤 From: @${sender.split('@')[0]}\n` +
                      `🗑️ Deleted by: @${deleter.split('@')[0]}\n\n` +
                      `📝 ${text}`,
                mentions: [sender, deleter]
            });
        } else if (mediaType) {
            try {
                const buffer = await downloadMediaMessage(deletedMsg, 'buffer', {});
                await this.sock.sendMessage(destination, {
                    [mediaType]: buffer,
                    caption: `🚨 *DELETED ${mediaType.toUpperCase()}*\n\n` +
                            `👤 From: @${sender.split('@')[0]}\n` +
                            `🗑️ Deleted by: @${deleter.split('@')[0]}`,
                    mentions: [sender, deleter]
                });
            } catch (e) {}
        }
    }
    
    // ==================== STATUS HANDLER ====================
    async handleStatus(msg) {
        if (config.STATUS.AUTO_VIEW === 'true') {
            await this.sock.readMessages([msg.key]);
        }
        
        if (config.STATUS.AUTO_REACT === 'true') {
            const emojis = config.STATUS.REACT_EMOJIS.split(',');
            const emoji = Helpers.randomItem(emojis);
            
            await this.sock.sendMessage('status@broadcast', {
                react: { key: msg.key, text: emoji }
            });
        }
        
        if (config.STATUS.AUTO_REPLY === 'true') {
            const sender = msg.key.participant || msg.key.remoteJid;
            
            await this.sock.sendMessage(sender, {
                text: config.STATUS.REPLY_TEXT
            });
        }
    }
}

module.exports = Features;