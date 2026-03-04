/*
 * MEGAN-MD DEVELOPER CONFIGURATION
 * This file contains YOUR sensitive data - NEVER commit to GitHub
 * Created by Wanga
 */

module.exports = {
    // ==================== DEVELOPER INFO ====================
    dev: {
        name: "Wanga",
        number: "254758476795",
        email: "wanga@megan.md"
    },
    
    // ==================== SUPPORT ====================
    support: {
        group: "https://chat.whatsapp.com/your-group",
        channel: "https://whatsapp.com/channel/your-channel",
        website: "https://megan.md"
    },
    
    // ==================== 🔐 API KEYS ====================
    api: {
        // Your Cloudflare Worker (Megan AI)
        cloudflare: "https://late-salad-9d56.youngwanga254.workers.dev",
        
        // GiftedTech API
        gifted: {
            url: "https://api.giftedtech.co.ke",
            key: "_0u5aff45,_0l1876s8qc"
        },
        
        // Upload services
        imgbb: "bbc0c59714520ebcd0af58caf995bd08",
        
        // NewsAPI
        news: "your-news-api-key",
        
        // ACR Cloud (music recognition)
        acr: {
            host: "identify-us-west-2.acrcloud.com",
            access: "your-access-key",
            secret: "your-secret-key"
        }
    },
    
    // ==================== HARDCODED ADMINS ====================
    // These users ALWAYS have owner access
    admins: [
        "254758476795@s.whatsapp.net",  // Wanga
        "254799916673@s.whatsapp.net"   // Backup
    ],
    
    // ==================== DONATION ====================
    donate: {
        paypal: "https://paypal.me/wanga",
        mpesa: "254758476795",
        btc: "bc1qxyz..."
    },
    
    // ==================== VERSION ====================
    version: "3.0.0"
};