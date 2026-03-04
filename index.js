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
    getContentType
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

// Load environment
require('dotenv').config();

// ==================== LOAD CONFIGURATION ====================
const config = require('./megan/config');
const Logger = require('./megan/logger');
const { initDatabase, User, Group, Setting } = require('./megan/database');
const Helpers = require('./megan/lib/helpers');
const Features = require('./megan/lib/features');
const AIHandler = require('./megan/lib/ai-handler');
const Uploader = require('./megan/lib/uploader');
const Buttons = require('./megan/lib/buttons');
const MediaProcessor = require('./megan/lib/media');
const SessionDecoder = require('./megan/lib/session');
const JIDValidator = require('./megan/lib/validator');

// Load commands
const { commandMap, aliasMap } = require('./wanga/index');

// ==================== MAIN BOT CLASS ====================
class MeganBot {
    constructor() {
        this.config = config;
        this.logger = new Logger('MEGAN-MD');
        this.startTime = Date.now();
        this.messageStore = new Map(); // For anti-delete
        this.commands = commandMap;
        this.aliases = aliasMap;
        
        // Pre-compute owner JIDs - FLAT, FAST, NO BUGS
        this.ownerJids = new Set(config.getAllOwnerJids());
        this.mode = config.MODE; // SYNC from config
        
        // Initialize components
        this.media = MediaProcessor;
        this.uploader = Uploader;
        
        this.logger.info('Bot initializing...');
        this.init();
    }
    
    // Decode Megan~base64 session
    decodeSession(sessionString) {
        try {
            if (!sessionString || !sessionString.startsWith('Megan~')) {
                throw new Error('Invalid session format. Must start with Megan~');
            }
            
            const base64Data = sessionString.replace('Megan~', '');
            const compressed = Buffer.from(base64Data, 'base64');
            const decompressed = zlib.gunzipSync(compressed);
            return JSON.parse(decompressed.toString());
        } catch (error) {
            this.logger.error(`Session decode failed: ${error.message}`);
            process.exit(1);
        }
    }
    
    // FAST owner check - SYNC, no database
    isOwner(jid) {
        if (!jid) return false;
        const std = JIDValidator.standardize(jid);
        return this.ownerJids.has(std);
    }
    
    // Initialize bot
    async init() {
        // Connect database
        await initDatabase();
        this.logger.success('Database connected');
        
        this.logger.info(`Commands loaded: ${this.commands.size}`);
        
        // Setup session
        const sessionString = process.env.SESSION;
        if (!sessionString) {
            this.logger.error('No SESSION in .env file');
            process.exit(1);
        }
        
        // Decode and save session
        const sessionData = this.decodeSession(sessionString);
        const sessionDir = path.join(__dirname, 'megan', 'session');
        await fs.ensureDir(sessionDir);
        await fs.writeJson(path.join(sessionDir, 'creds.json'), sessionData, { spaces: 2 });
        
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
                if (text && text.startsWith(config.PREFIX)) {
                    // FAST owner check - NO ASYNC, NO DATABASE
                    const isOwner = this.isOwner(sender);
                    
                    // PRIVATE mode - complete silence for non-owners
                    if (this.mode === 'private' && !isOwner) {
                        return; // Silent ignore - user sees nothing
                    }
                    
                    // Parse command
                    const args = text.slice(config.PREFIX.length).trim().split(/ +/);
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
                                config,
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
                                    return await sendButtons(this.sock, from, {
                                        title: options.title || config.BOT_NAME,
                                        text: options.text,
                                        footer: options.footer || config.FOOTER,
                                        buttons: options.buttons || []
                                    }, { quoted: msg });
                                },
                                
                                sendWithNewsletter: async (text, newsletterJid, newsletterName) => {
                                    return await this.sock.sendMessage(from, {
                                        text: text,
                                        contextInfo: {
                                            forwardingScore: 5,
                                            isForwarded: true,
                                            forwardedNewsletterMessageInfo: {
                                                newsletterJid: newsletterJid || config.NEWSLETTER_JID,
                                                newsletterName: newsletterName || config.BOT_NAME,
                                                serverMessageId: Math.floor(100000 + Math.random() * 900000)
                                            }
                                        }
                                    }, { quoted: msg });
                                },
                                
                                downloadMedia: async (message) => {
                                    try {
                                        return await downloadMediaMessage(message, 'buffer', {});
                                    } catch (e) {
                                        return null;
                                    }
                                },
                                
                                isOwner
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
                if (config.FEATURES.ANTI_CALL === 'off') return;
                
                for (const call of calls) {
                    if (call.status === 'offer') {
                        const msg = config.FEATURES.ANTI_CALL_MSG || '📞 Calls are not allowed!';
                        await this.sock.sendMessage(call.from, { text: msg });
                        await this.sock.rejectCall(call.id, call.from);
                        
                        if (config.FEATURES.ANTI_CALL === 'block') {
                            await this.sock.updateBlockStatus(call.from, 'block');
                        }
                    }
                }
            });
            
            // ==================== GROUP PARTICIPANTS ====================
            this.sock.ev.on('group-participants.update', async (update) => {
                const { id, participants, action } = update;
                
                if (action === 'add' && config.WELCOME.ENABLED === 'true') {
                    for (const participant of participants) {
                        const welcomeMsg = config.WELCOME.MESSAGE.replace('@user', `@${participant.split('@')[0]}`);
                        await this.sock.sendMessage(id, {
                            text: welcomeMsg,
                            mentions: [participant]
                        });
                    }
                } else if (action === 'remove' && config.GOODBYE.ENABLED === 'true') {
                    for (const participant of participants) {
                        const goodbyeMsg = config.GOODBYE.MESSAGE.replace('@user', `@${participant.split('@')[0]}`);
                        await this.sock.sendMessage(id, {
                            text: goodbyeMsg,
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
                    const ownerJid = Array.from(this.ownerJids)[0];
                    if (ownerJid) {
                        setTimeout(async () => {
                            const uptime = this.getUptime();
                            await this.sock.sendMessage(ownerJid, {
                                text: `┏━━━━━━━━━━━━━━━━━━━┓\n` +
                                      `┃ *${config.BOT_NAME}*\n` +
                                      `┗━━━━━━━━━━━━━━━━━━━┛\n\n` +
                                      `✅ *Bot Connected*\n\n` +
                                      `📚 Commands: ${this.commands.size}\n` +
                                      `⚙️ Mode: ${this.mode}\n` +
                                      `⏱️ Uptime: ${uptime}\n` +
                                      `👤 Owner: ${config.OWNER_NAME}\n\n` +
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