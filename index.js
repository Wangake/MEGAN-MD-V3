/*
 * MEGAN-MD - Advanced WhatsApp Bot
 * Created by Wanga
 * Version 3.0.0
 */

const { 
    default: makeWASocket,
    useMultiFileAuthState,
    fetchLatestBaileysVersion,
    DisconnectReason,
    downloadMediaMessage,
    getContentType,
    jidNormalizedUser
} = require('gifted-baileys');

const { sendButtons } = require('gifted-btns');
const { Sequelize, DataTypes } = require('sequelize');
const pino = require('pino');
const fs = require('fs-extra');
const path = require('path');
const axios = require('axios');
const zlib = require('zlib');
const moment = require('moment-timezone');
const { Boom } = require('@hapi/boom');

// Load environment variables
require('dotenv').config();

// ==================== LOAD CONFIGURATION ====================
const config = require('./megan/config');
const developer = require('./megan/developer');

// ==================== LOGGER ====================
class Logger {
    constructor(name = 'MEGAN-MD') {
        this.name = name;
    }
    
    getTime() {
        return new Date().toLocaleTimeString('en-US', { 
            hour12: false, 
            hour: '2-digit', 
            minute: '2-digit', 
            second: '2-digit' 
        });
    }
    
    info(message) {
        console.log(`[${this.getTime()}] [${this.name}] ℹ️ ${message}`);
    }
    
    success(message) {
        console.log(`[${this.getTime()}] [${this.name}] ✅ ${message}`);
    }
    
    warn(message) {
        console.log(`[${this.getTime()}] [${this.name}] ⚠️ ${message}`);
    }
    
    error(message) {
        console.log(`[${this.getTime()}] [${this.name}] ❌ ${message}`);
    }
    
    debug(message) {
        console.log(`[${this.getTime()}] [${this.name}] 🐛 ${message}`);
    }
}

// ==================== DATABASE SETUP ====================
const sequelize = new Sequelize({
    dialect: 'sqlite',
    storage: './megan/database.sqlite',
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
    antilink: { type: DataTypes.STRING, defaultValue: 'off' },
    settings: { type: DataTypes.JSON, defaultValue: {} }
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

// ==================== HELPERS ====================
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

// ==================== SESSION DECODER ====================
class SessionDecoder {
    // Decode Megan~base64 to JSON
    static decode(sessionString) {
        try {
            if (!sessionString || !sessionString.startsWith('Megan~')) {
                throw new Error('Invalid session format. Must start with Megan~');
            }
            
            const base64Data = sessionString.replace('Megan~', '');
            const compressed = Buffer.from(base64Data, 'base64');
            const decompressed = zlib.gunzipSync(compressed);
            
            return JSON.parse(decompressed.toString('utf8'));
        } catch (error) {
            throw new Error(`Failed to decode session: ${error.message}`);
        }
    }
    
    // Validate session string
    static isValid(sessionString) {
        if (!sessionString || typeof sessionString !== 'string') return false;
        if (!sessionString.startsWith('Megan~')) return false;
        
        try {
            const base64Part = sessionString.replace('Megan~', '');
            Buffer.from(base64Part, 'base64').toString('base64') === base64Part;
            return true;
        } catch {
            return false;
        }
    }
}

// ==================== FEATURES ====================
class Features {
    constructor(bot) {
        this.bot = bot;
        this.sock = bot.sock;
        this.logger = bot.logger;
        this.config = bot.config;
        
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
        if (this.config.FEATURES?.AUTO_REACT !== 'on') return;
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
        if (this.config.FEATURES?.AUTO_READ !== 'on') return;
        if (msg.key.fromMe) return;
        if (msg.key.remoteJid === 'status@broadcast') return;
        
        try {
            await this.sock.readMessages([msg.key]);
        } catch (e) {}
    }
    
    // ==================== ANTI LINK ====================
    async antiLink(msg, from, sender) {
        if (this.config.FEATURES?.ANTI_LINK === 'off') return false;
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
            
            const action = this.config.FEATURES.ANTI_LINK;
            
            if (action === 'kick') {
                await this.sock.groupParticipantsUpdate(from, [sender], 'remove');
                await this.sock.sendMessage(from, {
                    text: `⚠️ @${sender.split('@')[0]} kicked for sending a link!`,
                    mentions: [sender]
                });
            } else {
                const warning = this.config.FEATURES.ANTI_LINK_WARNING || 3;
                const message = this.config.FEATURES.ANTI_LINK_MESSAGE || '⚠️ Links are not allowed in this group!';
                
                await this.sock.sendMessage(from, {
                    text: `${message}\n\n@${sender.split('@')[0]}`,
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
        if (this.config.FEATURES?.ANTI_DELETE === 'off') return;
        
        const destination = this.config.FEATURES.ANTI_DELETE === 'inchat' 
            ? key.remoteJid 
            : this.bot.getOwnerJid();
        
        if (!destination) return;
        
        const text = Helpers.extractText(deletedMsg.message);
        const mediaType = Helpers.getMediaType(deletedMsg.message);
        
        try {
            if (text) {
                await this.sock.sendMessage(destination, {
                    text: `🚨 *DELETED MESSAGE*\n\n` +
                          `👤 From: @${sender.split('@')[0]}\n` +
                          `🗑️ Deleted by: @${deleter.split('@')[0]}\n` +
                          `💬 Chat: ${key.remoteJid.includes('@g.us') ? 'Group' : 'Private'}\n\n` +
                          `📝 ${text}`,
                    mentions: [sender, deleter]
                });
            } else if (mediaType) {
                const buffer = await downloadMediaMessage(deletedMsg, 'buffer', {});
                if (buffer) {
                    await this.sock.sendMessage(destination, {
                        [mediaType]: buffer,
                        caption: `🚨 *DELETED ${mediaType.toUpperCase()}*\n\n` +
                                `👤 From: @${sender.split('@')[0]}\n` +
                                `🗑️ Deleted by: @${deleter.split('@')[0]}`,
                        mentions: [sender, deleter]
                    });
                }
            }
        } catch (e) {
            this.logger.error(`Anti-delete error: ${e.message}`);
        }
    }
    
    // ==================== STATUS HANDLER ====================
    async handleStatus(msg) {
        if (this.config.STATUS?.AUTO_VIEW === 'on') {
            await this.sock.readMessages([msg.key]);
        }
        
        if (this.config.STATUS?.AUTO_REACT === 'on') {
            const emojis = this.config.STATUS?.REACT_EMOJIS?.split(',') || ['💛', '❤️', '💜', '🤍', '💙'];
            const emoji = Helpers.randomItem(emojis);
            
            await this.sock.sendMessage('status@broadcast', {
                react: { key: msg.key, text: emoji }
            });
        }
        
        if (this.config.STATUS?.AUTO_REPLY === 'on') {
            const sender = msg.key.participant || msg.key.remoteJid;
            const replyText = this.config.STATUS?.REPLY_TEXT || '✅ Status viewed via Megan-MD';
            
            await this.sock.sendMessage(sender, {
                text: replyText
            });
        }
    }
}

// ==================== AI HANDLER ====================
class AIHandler {
    constructor(bot) {
        this.bot = bot;
        this.config = bot.config;
        this.developer = developer;
        
        // Megan chat history (10 min memory)
        this.meganHistory = new Map();
        this.maxHistory = 10;
        
        // Start cleanup
        this.startCleanup();
    }
    
    startCleanup() {
        setInterval(() => {
            const now = Date.now();
            const tenMinsAgo = now - (10 * 60 * 1000);
            
            for (const [userId, history] of this.meganHistory.entries()) {
                const filtered = history.filter(msg => msg.timestamp > tenMinsAgo);
                if (filtered.length === 0) {
                    this.meganHistory.delete(userId);
                } else {
                    this.meganHistory.set(userId, filtered);
                }
            }
        }, 10 * 60 * 1000);
    }
    
    // ==================== MEGAN AI (Cloudflare - with memory) ====================
    async meganAI(message, userId) {
        try {
            const url = this.developer?.api?.cloudflare || process.env.CLOUDFLARE_WORKER;
            if (!url) throw new Error('Cloudflare URL not configured');
            
            const contextPrompt = this.createMeganPrompt(userId, message);
            
            const response = await axios({
                method: 'POST',
                url: url,
                headers: { 'Content-Type': 'application/json' },
                data: { 
                    prompt: contextPrompt, 
                    model: this.config.AI_MODEL || '@cf/meta/llama-3.1-8b-instruct' 
                },
                timeout: 20000
            });
            
            let result = response.data?.data?.response || 
                        response.data?.response || 
                        "I'm here to help!";
            
            this.addToHistory(userId, 'assistant', result);
            return result;
        } catch (error) {
            this.bot.logger.error(`Megan AI error: ${error.message}`);
            return "I'm here to help! Please try again.";
        }
    }
    
    createMeganPrompt(userId, message) {
        const history = this.getHistory(userId);
        
        if (history.length === 0) {
            return `You are Megan AI, a helpful assistant. Be friendly, helpful, and concise.\n\nUser: ${message}`;
        }
        
        let context = "Conversation history:\n\n";
        history.forEach(msg => {
            const role = msg.role === 'user' ? 'User' : 'Megan';
            context += `${role}: ${msg.content}\n`;
        });
        
        context += `\nUser: ${message}`;
        return context;
    }
    
    // ==================== GIFTED TECH AI ====================
    async callGiftedAI(endpoint, message) {
        try {
            const url = this.developer?.api?.gifted?.url || process.env.GIFTED_TECH_API;
            const key = this.developer?.api?.gifted?.key || process.env.GIFTED_API_KEY;
            
            if (!url || !key) throw new Error('Gifted API not configured');
            
            const response = await axios({
                method: 'GET',
                url: `${url}/api/ai/${endpoint}`,
                params: { apikey: key, q: message },
                timeout: 30000
            });
            
            return response.data?.result || 
                   response.data?.response || 
                   "Hello! How can I help?";
        } catch (error) {
            this.bot.logger.error(`GiftedAI (${endpoint}) error: ${error.message}`);
            return `${endpoint} service unavailable. Please try again.`;
        }
    }
    
    async deepseekAI(message) { return this.callGiftedAI('deepseek-r1', message); }
    async deepseekv3AI(message) { return this.callGiftedAI('deepseek-v3', message); }
    async letmegptAI(message) { return this.callGiftedAI('letmegpt', message); }
    async geminiproAI(message) { return this.callGiftedAI('geminiaipro', message); }
    async geminiAI(message) { return this.callGiftedAI('geminiai', message); }
    async blackboxAI(message) { return this.callGiftedAI('blackbox', message); }
    async mistralAI(message) { return this.callGiftedAI('mistral', message); }
    async openaiAI(message) { return this.callGiftedAI('openai', message); }
    async gpt4oMiniAI(message) { return this.callGiftedAI('gpt4o-mini', message); }
    async gpt4oAI(message) { return this.callGiftedAI('gpt4o', message); }
    async gpt4AI(message) { return this.callGiftedAI('gpt4', message); }
    async gptAI(message) { return this.callGiftedAI('gpt', message); }
    async chataiAI(message) { return this.callGiftedAI('chat', message); }
    async giftedaiAI(message) { return this.callGiftedAI('ai', message); }
    
    // ==================== HISTORY MANAGEMENT ====================
    getHistory(userId) {
        if (!this.meganHistory.has(userId)) {
            this.meganHistory.set(userId, []);
        }
        return this.meganHistory.get(userId);
    }
    
    addToHistory(userId, role, content) {
        const history = this.getHistory(userId);
        history.push({ role, content, timestamp: Date.now() });
        
        if (history.length > this.maxHistory) {
            this.meganHistory.set(userId, history.slice(-this.maxHistory));
        }
    }
    
    clearHistory(userId) {
        this.meganHistory.delete(userId);
    }
}

// ==================== MEDIA PROCESSOR ====================
class MediaProcessor {
    constructor() {
        this.tempDir = path.join(__dirname, 'megan', 'temp');
        fs.ensureDirSync(this.tempDir);
    }
    
    // ==================== STICKER TOOLS ====================
    async createSticker(buffer, options = {}) {
        try {
            const { Sticker, StickerTypes } = require('wa-sticker-formatter');
            
            const sticker = new Sticker(buffer, {
                pack: options.pack || 'MEGAN-MD',
                author: options.author || 'Wanga',
                type: options.type || StickerTypes.DEFAULT,
                quality: options.quality || 80,
                background: options.background || 'transparent'
            });
            
            return await sticker.toBuffer();
        } catch (error) {
            throw error;
        }
    }
    
    async stickerToImage(buffer) {
        try {
            const sharp = require('sharp');
            return await sharp(buffer).png().toBuffer();
        } catch (error) {
            throw error;
        }
    }
    
    // ==================== AUDIO TOOLS ====================
    async toAudio(buffer) {
        return this.processWithFFmpeg(buffer, 'mp3', (input, output) => {
            return new Promise((resolve, reject) => {
                const ffmpeg = require('fluent-ffmpeg');
                ffmpeg(input)
                    .noVideo()
                    .audioCodec('libmp3lame')
                    .audioBitrate(128)
                    .toFormat('mp3')
                    .on('end', resolve)
                    .on('error', reject)
                    .save(output);
            });
        });
    }
    
    async toPTT(buffer) {
        return this.processWithFFmpeg(buffer, 'ogg', (input, output) => {
            return new Promise((resolve, reject) => {
                const ffmpeg = require('fluent-ffmpeg');
                ffmpeg(input)
                    .noVideo()
                    .audioCodec('libopus')
                    .audioBitrate(24)
                    .audioChannels(1)
                    .audioFrequency(16000)
                    .toFormat('ogg')
                    .on('end', resolve)
                    .on('error', reject)
                    .save(output);
            });
        });
    }
    
    // ==================== VIDEO TOOLS ====================
    async toVideo(buffer) {
        return this.processWithFFmpeg(buffer, 'mp4', (input, output) => {
            return new Promise((resolve, reject) => {
                const ffmpeg = require('fluent-ffmpeg');
                ffmpeg(input)
                    .videoCodec('libx264')
                    .audioCodec('aac')
                    .outputOptions(['-preset ultrafast', '-movflags +faststart'])
                    .toFormat('mp4')
                    .on('end', resolve)
                    .on('error', reject)
                    .save(output);
            });
        });
    }
    
    // ==================== IMAGE TOOLS ====================
    async resize(buffer, width, height) {
        try {
            const sharp = require('sharp');
            return await sharp(buffer)
                .resize(width, height, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
                .toBuffer();
        } catch (error) {
            throw error;
        }
    }
    
    async circle(buffer) {
        try {
            const sharp = require('sharp');
            const image = sharp(buffer);
            const metadata = await image.metadata();
            
            const size = Math.min(metadata.width, metadata.height);
            
            return await image
                .resize(size, size)
                .composite([{
                    input: Buffer.from(`<svg><circle cx="${size/2}" cy="${size/2}" r="${size/2}" /></svg>`),
                    blend: 'dest-in'
                }])
                .png()
                .toBuffer();
        } catch (error) {
            throw error;
        }
    }
    
    // ==================== UTILITIES ====================
    async processWithFFmpeg(buffer, ext, processFn) {
        const inputPath = path.join(this.tempDir, `input_${Date.now()}.tmp`);
        const outputPath = path.join(this.tempDir, `output_${Date.now()}.${ext}`);
        
        try {
            await fs.writeFile(inputPath, buffer);
            await processFn(inputPath, outputPath);
            return await fs.readFile(outputPath);
        } finally {
            await fs.remove(inputPath).catch(() => {});
            await fs.remove(outputPath).catch(() => {});
        }
    }
}

// ==================== UPLOADER ====================
class Uploader {
    static bufferToStream(buffer) {
        const { Readable } = require('stream');
        const stream = new Readable();
        stream.push(buffer);
        stream.push(null);
        return stream;
    }
    
    static getFileContentType(ext) {
        const types = {
            '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png',
            '.gif': 'image/gif', '.webp': 'image/webp', '.mp4': 'video/mp4',
            '.mov': 'video/quicktime', '.mp3': 'audio/mpeg', '.ogg': 'audio/ogg',
            '.m4a': 'audio/mp4', '.pdf': 'application/pdf', '.txt': 'text/plain',
            '.zip': 'application/zip'
        };
        return types[ext.toLowerCase()] || 'application/octet-stream';
    }
    
    // Upload to Catbox
    static async catbox(buffer, filename) {
        try {
            const FormData = require('form-data');
            const form = new FormData();
            const stream = this.bufferToStream(buffer);
            
            form.append('reqtype', 'fileupload');
            form.append('userhash', '');
            form.append('fileToUpload', stream, {
                filename: filename,
                contentType: this.getFileContentType(path.extname(filename))
            });

            const { data } = await axios.post('https://catbox.moe/user/api.php', form, {
                headers: form.getHeaders(),
                maxContentLength: Infinity,
                maxBodyLength: Infinity
            });

            return { url: data.trim(), success: true };
        } catch (error) {
            return { url: null, success: false, error: error.message };
        }
    }
    
    // Upload to ImgBB
    static async imgbb(buffer, filename) {
        try {
            const apiKey = developer?.api?.imgbb || 'bbc0c59714520ebcd0af58caf995bd08';
            const FormData = require('form-data');
            const form = new FormData();
            const stream = this.bufferToStream(buffer);
            
            form.append('image', stream, {
                filename: filename,
                contentType: this.getFileContentType(path.extname(filename))
            });

            const { data } = await axios.post(
                `https://api.imgbb.com/1/upload?key=${apiKey}`,
                form,
                { headers: form.getHeaders() }
            );

            return { url: data.data.url, success: true };
        } catch (error) {
            return { url: null, success: false, error: error.message };
        }
    }
    
    // Auto-detect best uploader
    static async auto(buffer, filename) {
        let result = await this.catbox(buffer, filename);
        if (result.success) return result;
        
        result = await this.imgbb(buffer, filename);
        if (result.success) return result;
        
        return { url: null, success: false, error: 'All uploaders failed' };
    }
}

// ==================== BUTTONS ====================
class Buttons {
    constructor(sock) {
        this.sock = sock;
    }
    
    async send(jid, options, quoted = null) {
        return await sendButtons(this.sock, jid, {
            title: options.title || config.BOT_NAME,
            text: options.text,
            footer: options.footer || config.FOOTER,
            buttons: options.buttons || []
        }, { quoted });
    }
    
    async sendUrl(jid, text, url, displayText = 'Open Link', quoted = null) {
        return await this.send(jid, {
            text: text,
            buttons: [{
                name: 'cta_url',
                buttonParamsJson: JSON.stringify({
                    display_text: displayText,
                    url: url
                })
            }]
        }, quoted);
    }
    
    async sendCopy(jid, text, copyText, displayText = 'Copy', quoted = null) {
        return await this.send(jid, {
            text: text,
            buttons: [{
                name: 'cta_copy',
                buttonParamsJson: JSON.stringify({
                    display_text: displayText,
                    copy_code: copyText
                })
            }]
        }, quoted);
    }
}

// ==================== LOAD COMMANDS ====================
async function loadCommands() {
    const commandsPath = path.join(__dirname, 'wanga');
    const commands = new Map();
    const aliases = new Map();
    
    try {
        const files = await fs.readdir(commandsPath);
        
        for (const file of files) {
            if (!file.endsWith('.js')) continue;
            
            try {
                const commandModule = require(path.join(commandsPath, file));
                const commandsList = Array.isArray(commandModule) 
                    ? commandModule 
                    : (commandModule.commands || []);
                
                commandsList.forEach(cmd => {
                    if (cmd?.pattern) {
                        commands.set(cmd.pattern, cmd);
                        
                        if (cmd.aliases && Array.isArray(cmd.aliases)) {
                            cmd.aliases.forEach(alias => {
                                aliases.set(alias, cmd.pattern);
                            });
                        }
                    }
                });
                
                console.log(`✅ Loaded: ${file}`);
            } catch (err) {
                console.error(`❌ Error loading ${file}: ${err.message}`);
            }
        }
        
        console.log(`📚 Total commands: ${commands.size}`);
    } catch (err) {
        console.error(`❌ Failed to load commands: ${err.message}`);
    }
    
    return { commands, aliases };
}

// ==================== MAIN BOT CLASS ====================
class MeganBot {
    constructor() {
        this.config = config;
        this.developer = developer;
        this.logger = new Logger('MEGAN-MD');
        this.startTime = Date.now();
        this.messageStore = new Map();
        
        // Pre-compute owner JIDs - FLAT, FAST, NO BUGS
        this.ownerJids = this.buildOwnerJids();
        this.mode = config.MODE;
        
        // Initialize components
        this.media = new MediaProcessor();
        this.uploader = Uploader;
        
        this.logger.info('Bot initializing...');
        this.init();
    }
    
    // Build owner JIDs from config and developer
    buildOwnerJids() {
        const owners = new Set();
        
        // Add main owner from config
        if (this.config.OWNER_NUMBER) {
            owners.add(Helpers.standardizeJid(this.config.OWNER_NUMBER));
        }
        
        // Add sudo numbers from config
        if (this.config.SUDO_NUMBERS) {
            this.config.SUDO_NUMBERS.split(',').forEach(num => {
                if (num.trim()) {
                    owners.add(Helpers.standardizeJid(num.trim()));
                }
            });
        }
        
        // Add hardcoded admins from developer.js
        if (this.developer?.admins) {
            this.developer.admins.forEach(jid => {
                owners.add(Helpers.standardizeJid(jid));
            });
        }
        
        return owners;
    }
    
    // Get owner JID for sending messages
    getOwnerJid() {
        return Array.from(this.ownerJids)[0];
    }
    
    // FAST owner check - SYNC, no database
    isOwner(jid) {
        if (!jid) return false;
        const std = Helpers.standardizeJid(jid);
        return this.ownerJids.has(std);
    }
    
    // Decode Megan~base64 session
    decodeSession(sessionString) {
        return SessionDecoder.decode(sessionString);
    }
    
    // Get formatted uptime
    getUptime() {
        const uptime = (Date.now() - this.startTime) / 1000;
        const days = Math.floor(uptime / 86400);
        const hours = Math.floor((uptime % 86400) / 3600);
        const minutes = Math.floor((uptime % 3600) / 60);
        const seconds = Math.floor(uptime % 60);
        return `${days}d ${hours}h ${minutes}m ${seconds}s`;
    }
    
    // Cleanup temp files
    async cleanup() {
        try {
            const tempDir = path.join(__dirname, 'megan', 'temp');
            const files = await fs.readdir(tempDir);
            let deleted = 0;
            
            for (const file of files) {
                try {
                    await fs.remove(path.join(tempDir, file));
                    deleted++;
                } catch {}
            }
            
            this.logger.info(`Cleaned ${deleted} temp files`);
        } catch (err) {
            this.logger.error(`Cleanup error: ${err.message}`);
        }
    }
    
    // Initialize bot
    async init() {
        // Connect database
        await initDatabase();
        this.logger.success('Database connected');
        
        // Load commands
        const { commands, aliases } = await loadCommands();
        this.commands = commands;
        this.aliases = aliases;
        this.logger.info(`Commands loaded: ${this.commands.size}`);
        
        // Get session from .env
        const sessionString = process.env.SESSION;
        if (!sessionString) {
            this.logger.error('No SESSION in .env file');
            process.exit(1);
        }
        
        // Decode and save session
        try {
            const sessionData = this.decodeSession(sessionString);
            const sessionDir = path.join(__dirname, 'megan', 'session');
            await fs.ensureDir(sessionDir);
            await fs.writeJson(path.join(sessionDir, 'creds.json'), sessionData, { spaces: 2 });
            this.logger.success('Session loaded');
        } catch (error) {
            this.logger.error(`Session error: ${error.message}`);
            process.exit(1);
        }
        
        // Connect to WhatsApp
        await this.connect();
    }
    
    // Connect to WhatsApp
    async connect() {
        try {
            const { version } = await fetchLatestBaileysVersion();
            const { state, saveCreds } = await useMultiFileAuthState('./megan/session');
            
            this.sock = makeWASocket({
                version,
                auth: state,
                logger: pino({ level: 'silent' }),
                browser: ['MEGAN-MD', 'Safari', '3.0'],
                syncFullHistory: false,
                markOnlineOnConnect: true,
                generateHighQualityLinkPreview: false,
                defaultQueryTimeoutMs: 60000
            });
            
            // Initialize features and helpers
            this.features = new Features(this);
            this.ai = new AIHandler(this);
            this.buttons = new Buttons(this.sock);
            
            this.logger.success('WhatsApp connected');
            
            // ==================== SINGLE EVENT HANDLER ====================
            this.sock.ev.on('messages.upsert', async ({ messages }) => {
                const msg = messages[0];
                if (!msg?.message || !msg?.key) return;
                
                const from = msg.key.remoteJid;
                const sender = msg.key.participant || from;
                const isGroup = from.endsWith('@g.us');
                const text = Helpers.extractText(msg.message);
                
                // PRIORITY 1: ANTI-DELETE
                if (msg.message?.protocolMessage?.type === 0) {
                    const deletedId = msg.message.protocolMessage.key.id;
                    const deletedMsg = this.messageStore.get(deletedId);
                    
                    if (deletedMsg && this.config.FEATURES?.ANTI_DELETE !== 'off') {
                        const deleter = msg.key.participant || msg.key.remoteJid;
                        const originalSender = deletedMsg.key?.participant || deletedMsg.key?.remoteJid;
                        
                        await this.features.antiDelete(deletedMsg, msg.key, deleter, originalSender);
                        this.messageStore.delete(deletedId);
                    }
                    return;
                }
                
                // PRIORITY 2: STATUS
                if (from === 'status@broadcast') {
                    await this.features.handleStatus(msg);
                    return;
                }
                
                // Store message for anti-delete (1 hour)
                if (!msg.key.fromMe) {
                    this.messageStore.set(msg.key.id, msg);
                    setTimeout(() => this.messageStore.delete(msg.key.id), 60 * 60 * 1000);
                }
                
                // PRIORITY 3: AUTO FEATURES
                await this.features.autoReact(msg);
                await this.features.autoRead(msg);
                
                // Anti-link for groups
                if (isGroup) {
                    await this.features.antiLink(msg, from, sender);
                }
                
                // PRIORITY 4: COMMANDS
                if (text && text.startsWith(this.config.PREFIX)) {
                    // FAST owner check - NO ASYNC, NO DATABASE
                    const isOwner = this.isOwner(sender);
                    
                    // PRIVATE mode - complete silence for non-owners
                    if (this.mode === 'private' && !isOwner) {
                        return; // Silent ignore - user sees nothing
                    }
                    
                    // Parse command
                    const args = text.slice(this.config.PREFIX.length).trim().split(/ +/);
                    const cmdName = args.shift().toLowerCase();
                    
                    // Find command
                    let cmd = this.commands.get(cmdName);
                    if (!cmd && this.aliases.has(cmdName)) {
                        cmd = this.commands.get(this.aliases.get(cmdName));
                    }
                    
                    if (cmd) {
                        try {
                            // Auto-react if specified
                            if (cmd.react) {
                                await this.sock.sendMessage(from, {
                                    react: { key: msg.key, text: cmd.react }
                                });
                            }
                            
                            // Create rich context for command
                            const context = {
                                msg,
                                from,
                                sender,
                                isGroup,
                                args,
                                text: args.join(' '),
                                sock: this.sock,
                                bot: this,
                                ai: this.ai,
                                media: this.media,
                                uploader: this.uploader,
                                config: this.config,
                                developer: this.developer,
                                db: { User, Group, Setting },
                                logger: this.logger,
                                
                                // Helper functions
                                reply: async (t) => {
                                    return await this.sock.sendMessage(from, { text: t }, { quoted: msg });
                                },
                                
                                react: async (e) => {
                                    return await this.sock.sendMessage(from, {
                                        react: { key: msg.key, text: e }
                                    });
                                },
                                
                                sendButtons: async (options) => {
                                    return await this.buttons.send(from, options, msg);
                                },
                                
                                downloadMedia: async (message) => {
                                    try {
                                        return await downloadMediaMessage(message, 'buffer', {});
                                    } catch (e) {
                                        return null;
                                    }
                                },
                                
                                isOwner,
                                isGroup
                            };
                            
                            await cmd.execute(context);
                            
                        } catch (err) {
                            this.logger.error(`Command error (${cmdName}): ${err.message}`);
                            if (isOwner) {
                                await this.sock.sendMessage(from, { 
                                    text: `❌ Error: ${err.message}` 
                                }, { quoted: msg });
                            }
                        }
                    }
                }
            });
            
            // ==================== CALL HANDLER ====================
            this.sock.ev.on('call', async (calls) => {
                if (this.config.FEATURES?.ANTI_CALL === 'off') return;
                
                for (const call of calls) {
                    if (call.status === 'offer') {
                        const msg = this.config.FEATURES?.ANTI_CALL_MSG || '📞 Calls are not allowed!';
                        await this.sock.sendMessage(call.from, { text: msg });
                        await this.sock.rejectCall(call.id, call.from);
                        
                        if (this.config.FEATURES?.ANTI_CALL === 'block') {
                            await this.sock.updateBlockStatus(call.from, 'block');
                        }
                    }
                }
            });
            
            // ==================== GROUP PARTICIPANTS ====================
            this.sock.ev.on('group-participants.update', async (update) => {
                const { id, participants, action } = update;
                
                if (action === 'add' && this.config.WELCOME?.ENABLED === 'on') {
                    for (const participant of participants) {
                        const welcomeMsg = this.config.WELCOME?.MESSAGE || 'Hey @user welcome!';
                        await this.sock.sendMessage(id, {
                            text: welcomeMsg.replace('@user', `@${participant.split('@')[0]}`),
                            mentions: [participant]
                        });
                    }
                } else if (action === 'remove' && this.config.GOODBYE?.ENABLED === 'on') {
                    for (const participant of participants) {
                        const goodbyeMsg = this.config.GOODBYE?.MESSAGE || 'Goodbye @user! 👋';
                        await this.sock.sendMessage(id, {
                            text: goodbyeMsg.replace('@user', `@${participant.split('@')[0]}`),
                            mentions: [participant]
                        });
                    }
                }
            });
            
            // ==================== CONNECTION UPDATE ====================
            this.sock.ev.on('connection.update', (update) => {
                const { connection, lastDisconnect, qr } = update;
                
                if (qr) {
                    this.logger.info('QR Code received - scan with WhatsApp');
                    console.log(qr);
                }
                
                if (connection === 'connecting') {
                    this.logger.info('Connecting to WhatsApp...');
                }
                
                if (connection === 'open') {
                    this.logger.success('✅ MEGAN-MD CONNECTED!');
                    
                    // Send startup message to owner
                    const ownerJid = this.getOwnerJid();
                    if (ownerJid) {
                        setTimeout(async () => {
                            const uptime = this.getUptime();
                            await this.sock.sendMessage(ownerJid, {
                                text: `┏━━━━━━━━━━━━━━━━━━━┓\n` +
                                      `┃ *${this.config.BOT_NAME}*\n` +
                                      `┗━━━━━━━━━━━━━━━━━━━┛\n\n` +
                                      `✅ *Bot Connected*\n\n` +
                                      `📚 Commands: ${this.commands.size}\n` +
                                      `⚙️ Mode: ${this.mode}\n` +
                                      `⏱️ Uptime: ${uptime}\n` +
                                      `👤 Owner: ${this.config.OWNER_NAME}\n\n` +
                                      `> created by wanga`
                            });
                        }, 3000);
                    }
                }
                
                if (connection === 'close') {
                    const statusCode = lastDisconnect?.error instanceof Boom 
                        ? lastDisconnect.error.output.statusCode 
                        : 500;
                    
                    this.logger.warn(`Connection closed: ${statusCode}`);
                    
                    if (statusCode === DisconnectReason.loggedOut) {
                        this.logger.error('Logged out. Delete session and scan again.');
                        process.exit(1);
                    }
                    
                    // Reconnect after delay
                    this.logger.info('Reconnecting in 5 seconds...');
                    setTimeout(() => this.connect(), 5000);
                }
            });
            
            // ==================== CREDS UPDATE ====================
            this.sock.ev.on('creds.update', saveCreds);
            
        } catch (err) {
            this.logger.error(`Connection error: ${err.message}`);
            setTimeout(() => this.connect(), 5000);
        }
    }
}

// ==================== START BOT ====================
const bot = new MeganBot();

// Handle cleanup
process.on('SIGINT', async () => {
    console.log('\n🛑 Shutting down...');
    await bot.cleanup();
    process.exit(0);
});

process.on('SIGTERM', async () => {
    console.log('\n🛑 Shutting down...');
    await bot.cleanup();
    process.exit(0);
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
    console.error('Uncaught Exception:', err);
});

process.on('unhandledRejection', (err) => {
    console.error('Unhandled Rejection:', err);
});

module.exports = bot;