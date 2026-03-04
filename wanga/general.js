/*
 * MEGAN-MD General Commands
 * ping, menu, uptime, info, etc.
 */

const { sendButtons } = require('gifted-btns');
const os = require('os');

const BOT_START_TIME = Date.now();

const commands = [];

// ==================== PING COMMAND ====================
commands.push({
    pattern: 'ping',
    aliases: ['p', 'pingg'],
    react: '⚡',
    category: 'general',
    description: 'Check bot response time',
    async execute(context) {
        const { msg, from, sock, reply, react, sendButtons, config } = context;
        
        const start = Date.now();
        await react('⚡');
        
        const end = Date.now();
        const ping = end - start;
        
        await sendButtons({
            text: `🏓 *PONG!*\n\n📡 Response: ${ping}ms`,
            buttons: [{
                name: 'cta_url',
                buttonParamsJson: JSON.stringify({
                    display_text: 'Channel',
                    url: config.NEWSLETTER_URL || 'https://whatsapp.com/channel/'
                })
            }]
        });
        
        await react('✅');
    }
});

// ==================== UPTIME COMMAND ====================
commands.push({
    pattern: 'uptime',
    aliases: ['up', 'runtime'],
    react: '⏳',
    category: 'general',
    description: 'Show bot uptime',
    async execute(context) {
        const { reply, react } = context;
        
        const uptimeMs = Date.now() - BOT_START_TIME;
        const seconds = Math.floor((uptimeMs / 1000) % 60);
        const minutes = Math.floor((uptimeMs / (1000 * 60)) % 60);
        const hours = Math.floor((uptimeMs / (1000 * 60 * 60)) % 24);
        const days = Math.floor(uptimeMs / (1000 * 60 * 60 * 24));
        
        await reply(`⏱️ *Uptime:* ${days}d ${hours}h ${minutes}m ${seconds}s`);
        await react('✅');
    }
});

// ==================== INFO COMMAND ====================
commands.push({
    pattern: 'info',
    aliases: ['bot', 'stats'],
    react: '📊',
    category: 'general',
    description: 'Show bot information',
    async execute(context) {
        const { reply, react, config, sender } = context;
        
        const uptimeMs = Date.now() - BOT_START_TIME;
        const seconds = Math.floor((uptimeMs / 1000) % 60);
        const minutes = Math.floor((uptimeMs / (1000 * 60)) % 60);
        const hours = Math.floor((uptimeMs / (1000 * 60 * 60)) % 24);
        const days = Math.floor(uptimeMs / (1000 * 60 * 60 * 24));
        
        const totalMem = os.totalmem() / (1024 * 1024 * 1024);
        const freeMem = os.freemem() / (1024 * 1024 * 1024);
        const usedMem = (totalMem - freeMem).toFixed(2);
        
        const info = `┏━━━━━━━━━━━━━━━━━━━┓\n` +
                    `┃ *${config.BOT_NAME}*\n` +
                    `┗━━━━━━━━━━━━━━━━━━━┛\n\n` +
                    `👤 *Owner:* ${config.OWNER_NAME}\n` +
                    `📞 *Number:* ${config.OWNER_NUMBER}\n` +
                    `⚙️ *Mode:* ${config.MODE}\n` +
                    `🔧 *Prefix:* ${config.PREFIX}\n` +
                    `⏱️ *Uptime:* ${days}d ${hours}h ${minutes}m ${seconds}s\n` +
                    `💾 *RAM:* ${usedMem}GB/${totalMem.toFixed(2)}GB\n\n` +
                    `> created by wanga`;
        
        await reply(info);
        await react('✅');
    }
});

// ==================== MENU COMMAND ====================
commands.push({
    pattern: 'menu',
    aliases: ['help', 'allmenu', 'commands'],
    react: '📜',
    category: 'general',
    description: 'Show all commands',
    async execute(context) {
        const { msg, from, sock, reply, react, config, isOwner } = context;
        
        const uptimeMs = Date.now() - BOT_START_TIME;
        const seconds = Math.floor((uptimeMs / 1000) % 60);
        const minutes = Math.floor((uptimeMs / (1000 * 60)) % 60);
        const hours = Math.floor((uptimeMs / (1000 * 60 * 60)) % 24);
        const days = Math.floor(uptimeMs / (1000 * 60 * 60 * 24));
        
        // Categories and their commands
        const categories = {
            'GENERAL': ['ping', 'uptime', 'info', 'menu'],
            'DOWNLOADER': ['play', 'ytmp3', 'ytmp4', 'tiktok', 'spotify'],
            'CONVERTER': ['sticker', 'toimg', 'toaudio', 'toptt', 'tovideo'],
            'AI': ['megan', 'gemini', 'gpt4', 'llama', 'ai'],
            'GROUP': ['groupinfo', 'add', 'remove', 'promote', 'demote', 'tagall'],
            'OWNER': ['setmode', 'ban', 'unban', 'broadcast'],
            'TOOLS': ['weather', 'news', 'translate', 'qr']
        };
        
        let menu = `┏━━━━━━━━━━━━━━━━━━━┓\n` +
                  `┃ *${config.BOT_NAME}*\n` +
                  `┗━━━━━━━━━━━━━━━━━━━┛\n\n` +
                  `👤 *User:* @${sender.split('@')[0]}\n` +
                  `⚙️ *Mode:* ${config.MODE}\n` +
                  `⏱️ *Uptime:* ${days}d ${hours}h ${minutes}m\n\n`;
        
        for (const [category, cmds] of Object.entries(categories)) {
            menu += `━━━━━━━━━━━━━━━━━━━\n`;
            menu += `*${category}*\n`;
            menu += `━━━━━━━━━━━━━━━━━━━\n`;
            
            cmds.forEach(cmd => {
                menu += `┃ ◇ ${config.PREFIX}${cmd}\n`;
            });
            menu += `┃\n`;
        }
        
        menu += `━━━━━━━━━━━━━━━━━━━\n`;
        menu += `> created by wanga`;
        
        await sock.sendMessage(from, {
            text: menu,
            mentions: [sender]
        }, { quoted: msg });
        
        await react('✅');
    }
});

// ==================== SUPPORT COMMAND ====================
commands.push({
    pattern: 'support',
    aliases: ['owner', 'creator'],
    react: '👑',
    category: 'general',
    description: 'Show support information',
    async execute(context) {
        const { reply, react, config } = context;
        
        const support = `┏━━━━━━━━━━━━━━━━━━━┓\n` +
                       `┃ *SUPPORT INFO*\n` +
                       `┗━━━━━━━━━━━━━━━━━━━┛\n\n` +
                       `👤 *Developer:* ${config.DEV?.name || 'Wanga'}\n` +
                       `📞 *Number:* ${config.OWNER_NUMBER}\n` +
                       `📧 *Email:* ${config.DEV?.email || 'wanga@megan.md'}\n` +
                       `💬 *Group:* ${config.SUPPORT?.group || 'Coming soon'}\n` +
                       `📢 *Channel:* ${config.SUPPORT?.channel || 'Coming soon'}\n\n` +
                       `> created by wanga`;
        
        await reply(support);
        await react('✅');
    }
});

module.exports = commands;