/*
 * MEGAN-MD AI Handler
 * Multiple AI models with history
 */

const axios = require('axios');
const config = require('../config');

class AIHandler {
    constructor(bot) {
        this.bot = bot;
        this.config = config;
        
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
            const url = config.API?.cloudflare;
            if (!url) throw new Error('Cloudflare URL not configured');
            
            const contextPrompt = this.createMeganPrompt(userId, message);
            
            const response = await axios({
                method: 'POST',
                url: url,
                headers: { 'Content-Type': 'application/json' },
                data: { 
                    prompt: contextPrompt, 
                    model: '@cf/meta/llama-3.1-8b-instruct' 
                },
                timeout: 20000
            });
            
            let result = response.data?.data?.response || 
                        response.data?.response || 
                        "I'm here to help!";
            
            this.addToHistory(userId, 'assistant', result);
            return result;
        } catch (error) {
            console.error("Megan AI error:", error.message);
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
            const url = config.API?.gifted?.url;
            const key = config.API?.gifted?.key;
            
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
            console.error(`GiftedAI (${endpoint}) error:`, error.message);
            return `${endpoint} service unavailable. Please try again.`;
        }
    }
    
    // Individual AI methods
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

module.exports = AIHandler;