/*
 * MEGAN-MD Owner Commands
 * Bot administration and control
 */

const fs = require('fs-extra');
const path = require('path');
const os = require('os');

const commands = [];

// ==================== SET MODE ====================
commands.push({
    pattern: 'setmode',
    aliases: ['mode', 'changemode'],
    react: '⚙️',
    category: 'owner',
    description: 'Change bot mode (public/private)',
    async execute(context) {
        const { msg, from, sock, args, reply, react, isOwner, config, bot } = context;
        
        if (!isOwner) {
            return reply('❌ Owner only command');
        }
        
        if (args.length < 1) {
            return reply(`⚙️ Current mode: *${config.MODE}*\n\nUsage: .setmode public|private`);
        }
        
        const mode = args[0].toLowerCase();
        
        if (mode !== 'public' && mode !== 'private') {
            return reply('❌ Mode must be public or private');
        }
        
        // Update in memory
        bot.mode = mode;
        config.MODE = mode;
        
        // Update in database
        await context.db.Setting.upsert({
            key: 'mode',
            value: mode
        });
        
        await react('✅');
        await reply(`✅ Bot mode set to *${mode}*`);
    }
});

// ==================== BROADCAST ====================
commands.push({
    pattern: 'broadcast',
    aliases: ['bc', 'announce'],
    react: '📢',
    category: 'owner',
    description: 'Send message to all groups',
    async execute(context) {
        const { msg, from, sock, args, reply, react, isOwner, config } = context;
        
        if (!isOwner) {
            return reply('❌ Owner only command');
        }
        
        if (args.length < 1) {
            return reply('❌ Please provide message to broadcast');
        }
        
        await react('📢');
        await reply('📢 Broadcasting message...');
        
        const message = args.join(' ');
        
        try {
            const groups = await sock.groupFetchAllParticipating();
            const groupList = Object.values(groups);
            
            let success = 0;
            let failed = 0;
            
            for (const group of groupList) {
                try {
                    await sock.sendMessage(group.id, {
                        text: `📢 *BROADCAST*\n\n${message}\n\n> ${config.FOOTER}`
                    });
                    success++;
                    
                    // Delay to avoid rate limiting
                    await new Promise(resolve => setTimeout(resolve, 1000));
                } catch {
                    failed++;
                }
            }
            
            await reply(`📊 *Broadcast Complete*\n\n✅ Sent: ${success}\n❌ Failed: ${failed}`);
            await react('✅');
            
        } catch (error) {
            await react('❌');
            await reply(`❌ Error: ${error.message}`);
        }
    }
});

// ==================== UPDATE PROFILE ====================
commands.push({
    pattern: 'updateprofile',
    aliases: ['setprofile', 'updatebio'],
    react: '📝',
    category: 'owner',
    description: 'Update bot profile name and bio',
    async execute(context) {
        const { msg, from, sock, args, reply, react, isOwner, config } = context;
        
        if (!isOwner) {
            return reply('❌ Owner only command');
        }
        
        if (args.length < 2) {
            return reply('❌ Usage: .updateprofile <name> <bio>\nExample: .updateprofile MEGAN-MD I am a bot');
        }
        
        await react('📝');
        
        try {
            const name = args[0];
            const bio = args.slice(1).join(' ');
            
            await sock.updateProfileName(name);
            await sock.updateProfileStatus(bio);
            
            config.BOT_NAME = name;
            
            await reply(`✅ Profile updated\n\n📛 Name: ${name}\n📝 Bio: ${bio}`);
            await react('✅');
            
        } catch (error) {
            await react('❌');
            await reply(`❌ Error: ${error.message}`);
        }
    }
});

// ==================== SET BOT PIC ====================
commands.push({
    pattern: 'setbotpic',
    aliases: ['setpp', 'profilepic'],
    react: '🖼️',
    category: 'owner',
    description: 'Change bot profile picture',
    async execute(context) {
        const { msg, from, sock, reply, react, isOwner, quoted } = context;
        
        if (!isOwner) {
            return reply('❌ Owner only command');
        }
        
        if (!quoted) {
            return reply('❌ Please reply to an image');
        }
        
        const quotedImg = quoted?.imageMessage || quoted?.message?.imageMessage;
        
        if (!quotedImg) {
            return reply('❌ Please reply to an image');
        }
        
        await react('🖼️');
        
        try {
            const buffer = await context.downloadMedia(quotedImg);
            
            if (!buffer) {
                return reply('❌ Failed to download image');
            }
            
            await sock.updateProfilePicture(from, buffer);
            
            await reply('✅ Profile picture updated');
            await react('✅');
            
        } catch (error) {
            await react('❌');
            await reply(`❌ Error: ${error.message}`);
        }
    }
});

// ==================== SYSTEM INFO ====================
commands.push({
    pattern: 'sysinfo',
    aliases: ['system', 'stats'],
    react: '💻',
    category: 'owner',
    description: 'Show system information',
    async execute(context) {
        const { msg, from, sock, reply, react, isOwner, config, bot } = context;
        
        if (!isOwner) {
            return reply('❌ Owner only command');
        }
        
        await react('💻');
        
        const uptime = bot.getUptime();
        const memory = process.memoryUsage();
        const totalMem = os.totalmem() / (1024 * 1024 * 1024);
        const freeMem = os.freemem() / (1024 * 1024 * 1024);
        const usedMem = totalMem - freeMem;
        
        const info = `┏━━━━━━━━━━━━━━━━━━━┓\n` +
                    `┃ *SYSTEM INFO*\n` +
                    `┗━━━━━━━━━━━━━━━━━━━┛\n\n` +
                    `🤖 *Bot:* ${config.BOT_NAME}\n` +
                    `📦 *Version:* ${config.VERSION}\n` +
                    `⏱️ *Uptime:* ${uptime}\n` +
                    `📚 *Commands:* ${bot.commands.size}\n` +
                    `⚙️ *Mode:* ${bot.mode}\n\n` +
                    `💾 *Memory:*\n` +
                    `  RSS: ${(memory.rss / 1024 / 1024).toFixed(2)} MB\n` +
                    `  Heap: ${(memory.heapUsed / 1024 / 1024).toFixed(2)}/${(memory.heapTotal / 1024 / 1024).toFixed(2)} MB\n\n` +
                    `🖥️ *System:*\n` +
                    `  RAM: ${usedMem.toFixed(2)}/${totalMem.toFixed(2)} GB\n` +
                    `  CPU: ${os.cpus()[0].model}\n` +
                    `  Platform: ${process.platform}`;
        
        await reply(info);
        await react('✅');
    }
});

// ==================== EXEC COMMAND ====================
commands.push({
    pattern: 'exec',
    aliases: ['$', 'run'],
    react: '💻',
    category: 'owner',
    description: 'Execute shell command',
    async execute(context) {
        const { msg, from, sock, args, reply, react, isOwner } = context;
        
        if (!isOwner) {
            return reply('❌ Owner only command');
        }
        
        if (args.length < 1) {
            return reply('❌ Please provide command to execute');
        }
        
        await react('💻');
        
        const { exec } = require('child_process');
        const command = args.join(' ');
        
        exec(command, async (error, stdout, stderr) => {
            if (error) {
                await reply(`❌ Error:\n${error.message}`);
            } else if (stderr) {
                await reply(`⚠️ Stderr:\n${stderr}`);
            } else {
                await reply(`✅ Output:\n${stdout || 'No output'}`);
            }
            await react('✅');
        });
    }
});

// ==================== EVAL COMMAND ====================
commands.push({
    pattern: 'eval',
    aliases: ['evaluate'],
    react: '🔧',
    category: 'owner',
    description: 'Evaluate JavaScript code',
    async execute(context) {
        const { msg, from, sock, args, reply, react, isOwner } = context;
        
        if (!isOwner) {
            return reply('❌ Owner only command');
        }
        
        if (args.length < 1) {
            return reply('❌ Please provide code to evaluate');
        }
        
        await react('🔧');
        
        const code = args.join(' ');
        
        try {
            let result = eval(code);
            
            if (typeof result !== 'string') {
                result = JSON.stringify(result, null, 2);
            }
            
            const output = `✅ *Result:*\n\`\`\`\n${result}\n\`\`\``;
            
            if (output.length > 4000) {
                await reply('✅ Result too long, check console');
                console.log(result);
            } else {
                await reply(output);
            }
            
            await react('✅');
            
        } catch (error) {
            await react('❌');
            await reply(`❌ Error:\n${error.message}`);
        }
    }
});

// ==================== CLEAN TEMP ====================
commands.push({
    pattern: 'cleantemp',
    aliases: ['clearcache', 'tempclean'],
    react: '🧹',
    category: 'owner',
    description: 'Clean temporary files',
    async execute(context) {
        const { msg, from, sock, reply, react, isOwner, bot } = context;
        
        if (!isOwner) {
            return reply('❌ Owner only command');
        }
        
        await react('🧹');
        
        await bot.cleanup();
        
        await reply('✅ Temporary files cleaned');
        await react('✅');
    }
});

// ==================== RESTART ====================
commands.push({
    pattern: 'restart',
    aliases: ['reboot'],
    react: '🔄',
    category: 'owner',
    description: 'Restart the bot',
    async execute(context) {
        const { msg, from, sock, reply, react, isOwner } = context;
        
        if (!isOwner) {
            return reply('❌ Owner only command');
        }
        
        await react('🔄');
        await reply('🔄 Restarting...');
        
        process.exit(0);
    }
});

// ==================== SUDO ADD ====================
commands.push({
    pattern: 'addsudo',
    aliases: ['setsudo'],
    react: '👑',
    category: 'owner',
    description: 'Add sudo user',
    async execute(context) {
        const { msg, from, sock, args, reply, react, isOwner, config, bot } = context;
        
        if (!isOwner) {
            return reply('❌ Owner only command');
        }
        
        if (args.length < 1) {
            return reply('❌ Please provide number\nExample: .addsudo 254712345678');
        }
        
        const number = args[0].replace(/\D/g, '');
        const jid = `${number}@s.whatsapp.net`;
        
        // Add to owner JIDs
        bot.ownerJids.add(jid);
        
        // Update in database
        await context.db.Setting.upsert({
            key: 'sudo_numbers',
            value: JSON.stringify([...bot.ownerJids])
        });
        
        await reply(`✅ Added @${number} to sudo users`);
        await react('✅');
    }
});

module.exports = commands;