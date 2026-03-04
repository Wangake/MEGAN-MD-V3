/*
 * MEGAN-MD Buttons
 * Wrapper for gifted-btns
 */

const { sendButtons } = require('gifted-btns');
const config = require('../config');

class Buttons {
    constructor(sock) {
        this.sock = sock;
    }
    
    // Send URL button
    async sendUrl(jid, text, url, displayText = 'Open Link', quoted = null) {
        return await sendButtons(this.sock, jid, {
            text: text,
            footer: config.FOOTER,
            buttons: [{
                name: 'cta_url',
                buttonParamsJson: JSON.stringify({
                    display_text: displayText,
                    url: url
                })
            }]
        }, { quoted });
    }
    
    // Send copy button
    async sendCopy(jid, text, copyText, displayText = 'Copy', quoted = null) {
        return await sendButtons(this.sock, jid, {
            text: text,
            footer: config.FOOTER,
            buttons: [{
                name: 'cta_copy',
                buttonParamsJson: JSON.stringify({
                    display_text: displayText,
                    copy_code: copyText
                })
            }]
        }, { quoted });
    }
    
    // Send multiple buttons
    async send(jid, options, quoted = null) {
        return await sendButtons(this.sock, jid, {
            title: options.title || config.BOT_NAME,
            text: options.text,
            footer: options.footer || config.FOOTER,
            buttons: options.buttons || []
        }, { quoted });
    }
    
    // Send newsletter style
    async sendNewsletter(jid, text, newsletterJid, newsletterName, quoted = null) {
        return await this.sock.sendMessage(jid, {
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
        }, { quoted });
    }
    
    // Send with external ad reply
    async sendWithAd(jid, text, title, body, thumbnail, url, quoted = null) {
        return await this.sock.sendMessage(jid, {
            text: text,
            contextInfo: {
                externalAdReply: {
                    title: title || config.BOT_NAME,
                    body: body || 'MEGAN-MD',
                    thumbnailUrl: thumbnail || config.BOT_PIC,
                    mediaType: 1,
                    sourceUrl: url || config.NEWSLETTER_URL,
                    showAdAttribution: true
                }
            }
        }, { quoted });
    }
}

module.exports = Buttons;