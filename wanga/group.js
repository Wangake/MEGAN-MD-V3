/*
 * MEGAN-MD Group Management Commands
 * Full group administration tools
 */

const commands = [];

// ==================== GROUP INFO ====================
commands.push({
    pattern: 'groupinfo',
    aliases: ['ginfo', 'gcinfo'],
    react: '👥',
    category: 'group',
    description: 'Show group information',
    async execute(context) {
        const { msg, from, sock, reply, react, isGroup } = context;
        
        if (!isGroup) {
            return reply('❌ This command can only be used in groups');
        }
        
        await react('👥');
        
        try {
            const metadata = await sock.groupMetadata(from);
            const participants = metadata.participants;
            
            const admins = participants.filter(p => p.admin === 'admin' || p.admin === 'superadmin');
            const superAdmins = participants.filter(p => p.admin === 'superadmin');
            const members = participants.filter(p => !p.admin);
            
            const created = new Date(metadata.creation * 1000).toLocaleDateString();
            
            const info = `┏━━━━━━━━━━━━━━━━━━━┓\n` +
                        `┃ *GROUP INFORMATION*\n` +
                        `┗━━━━━━━━━━━━━━━━━━━┛\n\n` +
                        `📛 *Name:* ${metadata.subject}\n` +
                        `🆔 *ID:* ${metadata.id.split('@')[0]}\n` +
                        `👑 *Owner:* @${metadata.owner?.split('@')[0] || 'Unknown'}\n` +
                        `📅 *Created:* ${created}\n` +
                        `🔒 *Restrict:* ${metadata.restrict ? 'Yes' : 'No'}\n` +
                        `🔇 *Announce:* ${metadata.announce ? 'Yes' : 'No'}\n\n` +
                        `👥 *Total:* ${participants.length}\n` +
                        `👮 *Admins:* ${admins.length}\n` +
                        `👑 *Super Admins:* ${superAdmins.length}\n` +
                        `👤 *Members:* ${members.length}`;
            
            await sock.sendMessage(from, {
                text: info,
                mentions: [metadata.owner]
            }, { quoted: msg });
            
            await react('✅');
            
        } catch (error) {
            await react('❌');
            await reply(`❌ Error: ${error.message}`);
        }
    }
});

// ==================== GROUP LIST ====================
commands.push({
    pattern: 'grouplist',
    aliases: ['gclist', 'listgroups'],
    react: '📋',
    category: 'group',
    description: 'List all groups bot is in',
    async execute(context) {
        const { msg, from, sock, reply, react, config, isOwner } = context;
        
        if (!isOwner) {
            return reply('❌ Owner only command');
        }
        
        await react('📋');
        
        try {
            const groups = await sock.groupFetchAllParticipating();
            const groupList = Object.values(groups);
            
            let text = `┏━━━━━━━━━━━━━━━━━━━┓\n` +
                      `┃ *GROUPS (${groupList.length})*\n` +
                      `┗━━━━━━━━━━━━━━━━━━━┛\n\n`;
            
            groupList.forEach((group, i) => {
                text += `${i + 1}. *${group.subject}*\n`;
                text += `   👥 ${group.participants.length} members\n`;
                text += `   🆔 ${group.id.split('@')[0]}\n\n`;
            });
            
            await reply(text);
            await react('✅');
            
        } catch (error) {
            await react('❌');
            await reply(`❌ Error: ${error.message}`);
        }
    }
});

// ==================== ADD PARTICIPANT ====================
commands.push({
    pattern: 'add',
    aliases: ['adduser'],
    react: '➕',
    category: 'group',
    description: 'Add participant to group',
    async execute(context) {
        const { msg, from, sock, args, reply, react, isGroup, isOwner } = context;
        
        if (!isGroup) {
            return reply('❌ This command can only be used in groups');
        }
        
        if (args.length < 1) {
            return reply('❌ Please provide phone number\nExample: .add 254712345678');
        }
        
        await react('➕');
        
        try {
            const metadata = await sock.groupMetadata(from);
            const isAdmin = metadata.participants.some(p => 
                p.id === context.sender && (p.admin === 'admin' || p.admin === 'superadmin')
            );
            
            if (!isAdmin && !isOwner) {
                return reply('❌ You must be group admin to use this command');
            }
            
            const number = args[0].replace(/\D/g, '');
            const jid = `${number}@s.whatsapp.net`;
            
            const result = await sock.groupParticipantsUpdate(from, [jid], 'add');
            
            if (result[0].status === '200') {
                await reply(`✅ Added @${number} to group`);
            } else {
                await reply(`❌ Failed to add: ${result[0].status}`);
            }
            
            await react('✅');
            
        } catch (error) {
            await react('❌');
            await reply(`❌ Error: ${error.message}`);
        }
    }
});

// ==================== REMOVE PARTICIPANT ====================
commands.push({
    pattern: 'remove',
    aliases: ['kick', 'ban'],
    react: '➖',
    category: 'group',
    description: 'Remove participant from group',
    async execute(context) {
        const { msg, from, sock, reply, react, isGroup, isOwner, quoted } = context;
        
        if (!isGroup) {
            return reply('❌ This command can only be used in groups');
        }
        
        await react('➖');
        
        try {
            const metadata = await sock.groupMetadata(from);
            const isAdmin = metadata.participants.some(p => 
                p.id === context.sender && (p.admin === 'admin' || p.admin === 'superadmin')
            );
            
            if (!isAdmin && !isOwner) {
                return reply('❌ You must be group admin to use this command');
            }
            
            let targetJid;
            
            if (quoted) {
                targetJid = quoted.participant || quoted.key?.participant;
            } else if (msg.message?.extendedTextMessage?.contextInfo?.mentionedJid?.length) {
                targetJid = msg.message.extendedTextMessage.contextInfo.mentionedJid[0];
            } else {
                return reply('❌ Please mention or quote the user to remove');
            }
            
            if (targetJid === from || targetJid === context.sender) {
                return reply('❌ Cannot remove yourself');
            }
            
            const result = await sock.groupParticipantsUpdate(from, [targetJid], 'remove');
            
            if (result[0].status === '200') {
                await reply(`✅ Removed @${targetJid.split('@')[0]} from group`);
            } else {
                await reply(`❌ Failed to remove`);
            }
            
            await react('✅');
            
        } catch (error) {
            await react('❌');
            await reply(`❌ Error: ${error.message}`);
        }
    }
});

// ==================== PROMOTE TO ADMIN ====================
commands.push({
    pattern: 'promote',
    aliases: ['makeadmin'],
    react: '👑',
    category: 'group',
    description: 'Promote participant to admin',
    async execute(context) {
        const { msg, from, sock, reply, react, isGroup, isOwner, quoted } = context;
        
        if (!isGroup) {
            return reply('❌ This command can only be used in groups');
        }
        
        await react('👑');
        
        try {
            const metadata = await sock.groupMetadata(from);
            const isAdmin = metadata.participants.some(p => 
                p.id === context.sender && (p.admin === 'admin' || p.admin === 'superadmin')
            );
            
            if (!isAdmin && !isOwner) {
                return reply('❌ You must be group admin to use this command');
            }
            
            let targetJid;
            
            if (quoted) {
                targetJid = quoted.participant || quoted.key?.participant;
            } else if (msg.message?.extendedTextMessage?.contextInfo?.mentionedJid?.length) {
                targetJid = msg.message.extendedTextMessage.contextInfo.mentionedJid[0];
            } else {
                return reply('❌ Please mention or quote the user to promote');
            }
            
            const result = await sock.groupParticipantsUpdate(from, [targetJid], 'promote');
            
            if (result[0].status === '200') {
                await reply(`✅ Promoted @${targetJid.split('@')[0]} to admin`);
            } else {
                await reply(`❌ Failed to promote`);
            }
            
            await react('✅');
            
        } catch (error) {
            await react('❌');
            await reply(`❌ Error: ${error.message}`);
        }
    }
});

// ==================== DEMOTE ADMIN ====================
commands.push({
    pattern: 'demote',
    aliases: ['removeadmin'],
    react: '👤',
    category: 'group',
    description: 'Demote admin to member',
    async execute(context) {
        const { msg, from, sock, reply, react, isGroup, isOwner, quoted } = context;
        
        if (!isGroup) {
            return reply('❌ This command can only be used in groups');
        }
        
        await react('👤');
        
        try {
            const metadata = await sock.groupMetadata(from);
            const isAdmin = metadata.participants.some(p => 
                p.id === context.sender && (p.admin === 'admin' || p.admin === 'superadmin')
            );
            
            if (!isAdmin && !isOwner) {
                return reply('❌ You must be group admin to use this command');
            }
            
            let targetJid;
            
            if (quoted) {
                targetJid = quoted.participant || quoted.key?.participant;
            } else if (msg.message?.extendedTextMessage?.contextInfo?.mentionedJid?.length) {
                targetJid = msg.message.extendedTextMessage.contextInfo.mentionedJid[0];
            } else {
                return reply('❌ Please mention or quote the admin to demote');
            }
            
            const result = await sock.groupParticipantsUpdate(from, [targetJid], 'demote');
            
            if (result[0].status === '200') {
                await reply(`✅ Demoted @${targetJid.split('@')[0]} to member`);
            } else {
                await reply(`❌ Failed to demote`);
            }
            
            await react('✅');
            
        } catch (error) {
            await react('❌');
            await reply(`❌ Error: ${error.message}`);
        }
    }
});

// ==================== TAG ALL ====================
commands.push({
    pattern: 'tagall',
    aliases: ['mentionall', 'everyone'],
    react: '📢',
    category: 'group',
    description: 'Tag all group members',
    async execute(context) {
        const { msg, from, sock, args, reply, react, isGroup, isOwner } = context;
        
        if (!isGroup) {
            return reply('❌ This command can only be used in groups');
        }
        
        await react('📢');
        
        try {
            const metadata = await sock.groupMetadata(from);
            const isAdmin = metadata.participants.some(p => 
                p.id === context.sender && (p.admin === 'admin' || p.admin === 'superadmin')
            );
            
            if (!isAdmin && !isOwner) {
                return reply('❌ You must be group admin to use this command');
            }
            
            const participants = metadata.participants;
            const mentions = participants.map(p => p.id);
            const message = args.length ? args.join(' ') : '📢 *Attention everyone!*';
            
            let text = `┏━━━━━━━━━━━━━━━━━━━┓\n` +
                      `┃ *GROUP ANNOUNCEMENT*\n` +
                      `┗━━━━━━━━━━━━━━━━━━━┛\n\n` +
                      `${message}\n\n`;
            
            participants.forEach(p => {
                text += `┃ @${p.id.split('@')[0]}\n`;
            });
            
            await sock.sendMessage(from, {
                text: text,
                mentions: mentions
            }, { quoted: msg });
            
            await react('✅');
            
        } catch (error) {
            await react('❌');
            await reply(`❌ Error: ${error.message}`);
        }
    }
});

// ==================== GROUP SETTINGS ====================
commands.push({
    pattern: 'groupsettings',
    aliases: ['gcsettings', 'groupconfig'],
    react: '⚙️',
    category: 'group',
    description: 'Change group settings',
    async execute(context) {
        const { msg, from, sock, args, reply, react, isGroup, isOwner } = context;
        
        if (!isGroup) {
            return reply('❌ This command can only be used in groups');
        }
        
        if (args.length < 1) {
            return reply('❌ Usage:\n.groupettings open - Allow all members to send\n.groupettings closed - Only admins can send\n.groupettings unlock - Allow all to edit info\n.groupettings lock - Only admins can edit info');
        }
        
        await react('⚙️');
        
        try {
            const metadata = await sock.groupMetadata(from);
            const isAdmin = metadata.participants.some(p => 
                p.id === context.sender && (p.admin === 'admin' || p.admin === 'superadmin')
            );
            
            if (!isAdmin && !isOwner) {
                return reply('❌ You must be group admin to use this command');
            }
            
            const setting = args[0].toLowerCase();
            
            if (setting === 'open') {
                await sock.groupSettingUpdate(from, 'not_announcement');
                await reply('✅ Group opened - all members can send');
            } else if (setting === 'closed') {
                await sock.groupSettingUpdate(from, 'announcement');
                await reply('✅ Group closed - only admins can send');
            } else if (setting === 'unlock') {
                await sock.groupSettingUpdate(from, 'unlocked');
                await reply('✅ Group unlocked - all can edit info');
            } else if (setting === 'lock') {
                await sock.groupSettingUpdate(from, 'locked');
                await reply('✅ Group locked - only admins can edit info');
            } else {
                return reply('❌ Invalid setting. Use: open, closed, unlock, lock');
            }
            
            await react('✅');
            
        } catch (error) {
            await react('❌');
            await reply(`❌ Error: ${error.message}`);
        }
    }
});

// ==================== LINK GROUP ====================
commands.push({
    pattern: 'linkgroup',
    aliases: ['gclink', 'invitelink'],
    react: '🔗',
    category: 'group',
    description: 'Get group invite link',
    async execute(context) {
        const { msg, from, sock, reply, react, isGroup, isOwner } = context;
        
        if (!isGroup) {
            return reply('❌ This command can only be used in groups');
        }
        
        await react('🔗');
        
        try {
            const metadata = await sock.groupMetadata(from);
            const isAdmin = metadata.participants.some(p => 
                p.id === context.sender && (p.admin === 'admin' || p.admin === 'superadmin')
            );
            
            if (!isAdmin && !isOwner) {
                return reply('❌ You must be group admin to get invite link');
            }
            
            const code = await sock.groupInviteCode(from);
            const link = `https://chat.whatsapp.com/${code}`;
            
            await reply(`🔗 *Group Link*\n\n${link}`);
            await react('✅');
            
        } catch (error) {
            await react('❌');
            await reply(`❌ Error: ${error.message}`);
        }
    }
});

// ==================== REVOKE LINK ====================
commands.push({
    pattern: 'revoke',
    aliases: ['revokelink', 'newlink'],
    react: '🔄',
    category: 'group',
    description: 'Revoke and generate new invite link',
    async execute(context) {
        const { msg, from, sock, reply, react, isGroup, isOwner } = context;
        
        if (!isGroup) {
            return reply('❌ This command can only be used in groups');
        }
        
        await react('🔄');
        
        try {
            const metadata = await sock.groupMetadata(from);
            const isAdmin = metadata.participants.some(p => 
                p.id === context.sender && (p.admin === 'admin' || p.admin === 'superadmin')
            );
            
            if (!isAdmin && !isOwner) {
                return reply('❌ You must be group admin to revoke link');
            }
            
            await sock.groupRevokeInvite(from);
            const code = await sock.groupInviteCode(from);
            const link = `https://chat.whatsapp.com/${code}`;
            
            await reply(`🔄 *New Link Created*\n\n${link}`);
            await react('✅');
            
        } catch (error) {
            await react('❌');
            await reply(`❌ Error: ${error.message}`);
        }
    }
});

// ==================== JOIN GROUP ====================
commands.push({
    pattern: 'join',
    aliases: ['joingroup'],
    react: '🚪',
    category: 'group',
    description: 'Join group via invite link',
    async execute(context) {
        const { msg, from, sock, args, reply, react, isOwner } = context;
        
        if (!isOwner) {
            return reply('❌ Owner only command');
        }
        
        if (args.length < 1) {
            return reply('❌ Please provide invite link');
        }
        
        await react('🚪');
        
        try {
            const link = args[0];
            const code = link.split('chat.whatsapp.com/')[1] || link;
            
            const result = await sock.groupAcceptInvite(code);
            
            await reply(`✅ Joined group successfully`);
            await react('✅');
            
        } catch (error) {
            await react('❌');
            await reply(`❌ Error: ${error.message}`);
        }
    }
});

// ==================== LEAVE GROUP ====================
commands.push({
    pattern: 'leave',
    aliases: ['leavegc', 'exit'],
    react: '🚪',
    category: 'group',
    description: 'Leave current group',
    async execute(context) {
        const { msg, from, sock, reply, react, isGroup, isOwner } = context;
        
        if (!isGroup) {
            return reply('❌ This command can only be used in groups');
        }
        
        await react('🚪');
        
        try {
            const metadata = await sock.groupMetadata(from);
            const isAdmin = metadata.participants.some(p => 
                p.id === context.sender && (p.admin === 'admin' || p.admin === 'superadmin')
            );
            
            if (!isAdmin && !isOwner) {
                return reply('❌ You must be group admin to make bot leave');
            }
            
            await reply('👋 Goodbye!');
            await sock.groupLeave(from);
            
        } catch (error) {
            await react('❌');
            await reply(`❌ Error: ${error.message}`);
        }
    }
});

module.exports = commands;