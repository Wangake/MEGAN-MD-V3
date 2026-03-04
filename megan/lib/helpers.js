/*
 * MEGAN-MD Helper Functions
 */

const config = require('../config');

class Helpers {
    // Extract text from message
    static extractText(message) {
        if (!message) return '';
        
        if (message.conversation) return message.conversation;
        if (message.extendedTextMessage?.text) return message.extendedTextMessage.text;
        if (message.imageMessage?.caption) return message.imageMessage.caption;
        if (message.videoMessage?.caption) return message.videoMessage.caption;
        if (message.documentMessage?.caption) return message.documentMessage.caption;
        
        return '';
    }
    
    // Get media type
    static getMediaType(message) {
        if (!message) return null;
        
        if (message.imageMessage) return 'image';
        if (message.videoMessage) return 'video';
        if (message.audioMessage) return 'audio';
        if (message.stickerMessage) return 'sticker';
        if (message.documentMessage) return 'document';
        
        return null;
    }
    
    // Standardize JID
    static standardizeJid(jid) {
        if (!jid) return '';
        
        if (/^\d+$/.test(jid)) {
            return jid + '@s.whatsapp.net';
        }
        
        jid = String(jid).split(':')[0].split('/')[0];
        
        if (!jid.includes('@')) {
            jid = jid + '@s.whatsapp.net';
        }
        
        return jid.toLowerCase();
    }
    
    // Format time
    static formatTime(timestamp) {
        const date = new Date(timestamp);
        return date.toLocaleTimeString('en-US', { 
            hour12: true, 
            hour: '2-digit', 
            minute: '2-digit' 
        });
    }
    
    // Format date
    static formatDate(timestamp) {
        const date = new Date(timestamp);
        return date.toLocaleDateString('en-GB', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });
    }
    
    // Format bytes
    static formatBytes(bytes) {
        if (bytes >= 1024 * 1024 * 1024) {
            return (bytes / (1024 * 1024 * 1024)).toFixed(2) + ' GB';
        } else if (bytes >= 1024 * 1024) {
            return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
        } else if (bytes >= 1024) {
            return (bytes / 1024).toFixed(2) + ' KB';
        }
        return bytes + ' bytes';
    }
    
    // Check if URL
    static isUrl(string) {
        const pattern = /https?:\/\/[^\s]+|www\.[^\s]+/gi;
        return pattern.test(string);
    }
    
    // Random item from array
    static randomItem(array) {
        return array[Math.floor(Math.random() * array.length)];
    }
    
    // Sleep
    static sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

module.exports = Helpers;