/*
 * MEGAN-MD Converter Commands
 * Sticker, Image, Audio, Video conversion
 */

const fs = require('fs-extra');
const path = require('path');
const { Sticker, StickerTypes } = require('wa-sticker-formatter');

const commands = [];
const TEMP_DIR = path.join(__dirname, '../megan/temp');

// Ensure temp directory exists
fs.ensureDirSync(TEMP_DIR);

// ==================== STICKER COMMAND ====================
commands.push({
    pattern: 'sticker',
    aliases: ['st', 's', 'stick'],
    react: '🔄',
    category: 'converter',
    description: 'Convert image/video to sticker',
    async execute(context) {
        const { msg, from, sock, args, reply, react, quoted, config, media } = context;
        
        if (!quoted) {
            return reply(`❌ Please reply to an image or video\nExample: ${config.PREFIX}sticker`);
        }
        
        const quotedImg = quoted?.imageMessage || quoted?.message?.imageMessage;
        const quotedVideo = quoted?.videoMessage || quoted?.message?.videoMessage;
        const quotedSticker = quoted?.stickerMessage || quoted?.message?.stickerMessage;
        
        if (!quotedImg && !quotedVideo && !quotedSticker) {
            return reply('❌ Please reply to an image, video, or sticker');
        }
        
        await react('🔄');
        
        try {
            let buffer;
            let isVideo = false;
            
            if (quotedImg) {
                buffer = await context.downloadMedia(quotedImg);
            } else if (quotedVideo) {
                buffer = await context.downloadMedia(quotedVideo);
                isVideo = true;
            } else if (quotedSticker) {
                buffer = await context.downloadMedia(quotedSticker);
            }
            
            if (!buffer) {
                return reply('❌ Failed to download media');
            }
            
            // Check crop option
            const isCrop = args.includes('--crop') || args.includes('-c');
            
            // Create sticker
            const stickerBuffer = await media.createSticker(buffer, {
                pack: config.PACK_NAME || 'MEGAN-MD',
                author: config.PACK_AUTHOR || 'Wanga',
                type: isCrop ? StickerTypes.CROPPED : StickerTypes.FULL,
                quality: 80
            });
            
            await sock.sendMessage(from, {
                sticker: stickerBuffer
            }, { quoted: msg });
            
            await react('✅');
            
        } catch (error) {
            await react('❌');
            await reply(`❌ Error: ${error.message}`);
        }
    }
});

// ==================== TO IMAGE COMMAND ====================
commands.push({
    pattern: 'toimg',
    aliases: ['s2img', 'sticker2img'],
    react: '🖼️',
    category: 'converter',
    description: 'Convert sticker to image',
    async execute(context) {
        const { msg, from, sock, reply, react, quoted, config, media } = context;
        
        if (!quoted) {
            return reply('❌ Please reply to a sticker');
        }
        
        const quotedSticker = quoted?.stickerMessage || quoted?.message?.stickerMessage;
        
        if (!quotedSticker) {
            return reply('❌ Please reply to a sticker');
        }
        
        await react('🖼️');
        
        try {
            const buffer = await context.downloadMedia(quotedSticker);
            
            if (!buffer) {
                return reply('❌ Failed to download sticker');
            }
            
            const imageBuffer = await media.stickerToImage(buffer);
            
            await sock.sendMessage(from, {
                image: imageBuffer,
                caption: `✅ Converted to image\n\n> ${config.FOOTER}`
            }, { quoted: msg });
            
            await react('✅');
            
        } catch (error) {
            await react('❌');
            await reply(`❌ Error: ${error.message}`);
        }
    }
});

// ==================== TO AUDIO COMMAND ====================
commands.push({
    pattern: 'toaudio',
    aliases: ['tomp3', 'video2mp3'],
    react: '🎵',
    category: 'converter',
    description: 'Convert video to audio',
    async execute(context) {
        const { msg, from, sock, reply, react, quoted, config, media } = context;
        
        if (!quoted) {
            return reply('❌ Please reply to a video');
        }
        
        const quotedVideo = quoted?.videoMessage || quoted?.message?.videoMessage;
        
        if (!quotedVideo) {
            return reply('❌ Please reply to a video');
        }
        
        await react('🎵');
        
        try {
            const buffer = await context.downloadMedia(quotedVideo);
            
            if (!buffer) {
                return reply('❌ Failed to download video');
            }
            
            const audioBuffer = await media.toAudio(buffer);
            
            await sock.sendMessage(from, {
                audio: audioBuffer,
                mimetype: 'audio/mpeg',
                ptt: false
            }, { quoted: msg });
            
            await react('✅');
            
        } catch (error) {
            await react('❌');
            await reply(`❌ Error: ${error.message}`);
        }
    }
});

// ==================== TO VOICE NOTE COMMAND ====================
commands.push({
    pattern: 'toptt',
    aliases: ['tovn', 'tovoicenote', 'voice'],
    react: '🎤',
    category: 'converter',
    description: 'Convert audio to voice note',
    async execute(context) {
        const { msg, from, sock, reply, react, quoted, config, media } = context;
        
        if (!quoted) {
            return reply('❌ Please reply to an audio');
        }
        
        const quotedAudio = quoted?.audioMessage || quoted?.message?.audioMessage;
        
        if (!quotedAudio) {
            return reply('❌ Please reply to an audio');
        }
        
        await react('🎤');
        
        try {
            const buffer = await context.downloadMedia(quotedAudio);
            
            if (!buffer) {
                return reply('❌ Failed to download audio');
            }
            
            const pttBuffer = await media.toPTT(buffer);
            
            await sock.sendMessage(from, {
                audio: pttBuffer,
                mimetype: 'audio/ogg; codecs=opus',
                ptt: true
            }, { quoted: msg });
            
            await react('✅');
            
        } catch (error) {
            await react('❌');
            await reply(`❌ Error: ${error.message}`);
        }
    }
});

// ==================== TO VIDEO COMMAND ====================
commands.push({
    pattern: 'tovideo',
    aliases: ['tomp4', 'audio2video'],
    react: '🎬',
    category: 'converter',
    description: 'Convert audio to video with black screen',
    async execute(context) {
        const { msg, from, sock, reply, react, quoted, config, media } = context;
        
        if (!quoted) {
            return reply('❌ Please reply to an audio');
        }
        
        const quotedAudio = quoted?.audioMessage || quoted?.message?.audioMessage;
        
        if (!quotedAudio) {
            return reply('❌ Please reply to an audio');
        }
        
        await react('🎬');
        
        try {
            const buffer = await context.downloadMedia(quotedAudio);
            
            if (!buffer) {
                return reply('❌ Failed to download audio');
            }
            
            const videoBuffer = await media.toVideo(buffer);
            
            await sock.sendMessage(from, {
                video: videoBuffer,
                caption: `✅ Converted to video\n\n> ${config.FOOTER}`
            }, { quoted: msg });
            
            await react('✅');
            
        } catch (error) {
            await react('❌');
            await reply(`❌ Error: ${error.message}`);
        }
    }
});

// ==================== CIRCLE IMAGE COMMAND ====================
commands.push({
    pattern: 'circle',
    aliases: ['round', 'circleimg'],
    react: '⭕',
    category: 'converter',
    description: 'Make image circle',
    async execute(context) {
        const { msg, from, sock, reply, react, quoted, config, media } = context;
        
        if (!quoted) {
            return reply('❌ Please reply to an image');
        }
        
        const quotedImg = quoted?.imageMessage || quoted?.message?.imageMessage;
        
        if (!quotedImg) {
            return reply('❌ Please reply to an image');
        }
        
        await react('⭕');
        
        try {
            const buffer = await context.downloadMedia(quotedImg);
            
            if (!buffer) {
                return reply('❌ Failed to download image');
            }
            
            const circleBuffer = await media.circle(buffer);
            
            await sock.sendMessage(from, {
                image: circleBuffer,
                caption: `✅ Circle image created\n\n> ${config.FOOTER}`
            }, { quoted: msg });
            
            await react('✅');
            
        } catch (error) {
            await react('❌');
            await reply(`❌ Error: ${error.message}`);
        }
    }
});

// ==================== RESIZE IMAGE COMMAND ====================
commands.push({
    pattern: 'resize',
    aliases: ['resizeimg'],
    react: '📐',
    category: 'converter',
    description: 'Resize image (width height)',
    async execute(context) {
        const { msg, from, sock, args, reply, react, quoted, config, media } = context;
        
        if (!quoted) {
            return reply('❌ Please reply to an image\nExample: .resize 500 500');
        }
        
        if (args.length < 2) {
            return reply('❌ Please provide width and height\nExample: .resize 500 500');
        }
        
        const width = parseInt(args[0]);
        const height = parseInt(args[1]);
        
        if (isNaN(width) || isNaN(height) || width < 10 || height < 10) {
            return reply('❌ Invalid dimensions. Use numbers > 10');
        }
        
        const quotedImg = quoted?.imageMessage || quoted?.message?.imageMessage;
        
        if (!quotedImg) {
            return reply('❌ Please reply to an image');
        }
        
        await react('📐');
        
        try {
            const buffer = await context.downloadMedia(quotedImg);
            
            if (!buffer) {
                return reply('❌ Failed to download image');
            }
            
            const resizedBuffer = await media.resize(buffer, width, height);
            
            await sock.sendMessage(from, {
                image: resizedBuffer,
                caption: `✅ Resized to ${width}x${height}\n\n> ${config.FOOTER}`
            }, { quoted: msg });
            
            await react('✅');
            
        } catch (error) {
            await react('❌');
            await reply(`❌ Error: ${error.message}`);
        }
    }
});

// ==================== TAKE STICKER COMMAND ====================
commands.push({
    pattern: 'take',
    aliases: ['steal', 'rename'],
    react: '📝',
    category: 'converter',
    description: 'Change sticker pack name',
    async execute(context) {
        const { msg, from, sock, args, reply, react, quoted, config, media } = context;
        
        if (!quoted) {
            return reply('❌ Please reply to a sticker');
        }
        
        if (args.length < 2) {
            return reply('❌ Please provide pack and author\nExample: .take PackName AuthorName');
        }
        
        const packName = args[0];
        const authorName = args.slice(1).join(' ');
        
        const quotedSticker = quoted?.stickerMessage || quoted?.message?.stickerMessage;
        
        if (!quotedSticker) {
            return reply('❌ Please reply to a sticker');
        }
        
        await react('📝');
        
        try {
            const buffer = await context.downloadMedia(quotedSticker);
            
            if (!buffer) {
                return reply('❌ Failed to download sticker');
            }
            
            const stickerBuffer = await media.createSticker(buffer, {
                pack: packName,
                author: authorName,
                quality: 80
            });
            
            await sock.sendMessage(from, {
                sticker: stickerBuffer
            }, { quoted: msg });
            
            await react('✅');
            
        } catch (error) {
            await react('❌');
            await reply(`❌ Error: ${error.message}`);
        }
    }
});

// ==================== GIF TO STICKER ====================
commands.push({
    pattern: 'gif',
    aliases: ['gif2sticker'],
    react: '🎞️',
    category: 'converter',
    description: 'Convert GIF to animated sticker',
    async execute(context) {
        const { msg, from, sock, reply, react, quoted, config, media } = context;
        
        if (!quoted) {
            return reply('❌ Please reply to a GIF/video');
        }
        
        const quotedVideo = quoted?.videoMessage || quoted?.message?.videoMessage;
        
        if (!quotedVideo) {
            return reply('❌ Please reply to a GIF or short video');
        }
        
        await react('🎞️');
        
        try {
            const buffer = await context.downloadMedia(quotedVideo);
            
            if (!buffer) {
                return reply('❌ Failed to download media');
            }
            
            const stickerBuffer = await media.createSticker(buffer, {
                pack: config.PACK_NAME || 'MEGAN-MD',
                author: config.PACK_AUTHOR || 'Wanga',
                quality: 70
            });
            
            await sock.sendMessage(from, {
                sticker: stickerBuffer
            }, { quoted: msg });
            
            await react('✅');
            
        } catch (error) {
            await react('❌');
            await reply(`❌ Error: ${error.message}`);
        }
    }
});

module.exports = commands;