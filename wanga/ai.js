/*
 * MEGAN-MD AI Commands
 * All AI models in one file
 */

const commands = [];

// Helper to create AI commands
function createAICommand(pattern, description, modelName) {
    return {
        pattern,
        aliases: [pattern],
        react: '🤖',
        category: 'ai',
        description,
        async execute(context) {
            const { msg, args, reply, react, config } = context;
            
            if (!args.length) {
                return reply(`❌ Please provide a prompt\nExample: ${config.PREFIX}${pattern} hello`);
            }
            
            await react('🤖');
            
            const query = args.join(' ');
            
            try {
                // Access AI from bot instance (we'll add this to index.js)
                const ai = context.bot?.ai;
                
                if (!ai) {
                    return reply('❌ AI system not initialized');
                }
                
                let response;
                
                // Call appropriate AI method
                switch(pattern) {
                    case 'megan': response = await ai.meganAI(query, msg.key.participant); break;
                    case 'gemini': response = await ai.geminiAI(query); break;
                    case 'gpt4': response = await ai.gpt4AI(query); break;
                    case 'llama': response = await ai.llamaAI?.(query) || await ai.meganAI(query); break;
                    case 'deepseek': response = await ai.deepseekAI(query); break;
                    case 'mistral': response = await ai.mistralAI(query); break;
                    case 'blackbox': response = await ai.blackboxAI(query); break;
                    default: response = await ai.giftedaiAI(query);
                }
                
                await reply(response);
                await react('✅');
                
            } catch (error) {
                await reply(`❌ Error: ${error.message}`);
                await react('❌');
            }
        }
    };
}

// Add all AI commands
commands.push(createAICommand('ai', 'General AI assistant', 'ai'));
commands.push(createAICommand('megan', 'Megan AI with memory', 'megan'));
commands.push(createAICommand('gemini', 'Google Gemini AI', 'gemini'));
commands.push(createAICommand('gpt4', 'GPT-4 AI model', 'gpt4'));
commands.push(createAICommand('gpt4o', 'GPT-4o AI model', 'gpt4o'));
commands.push(createAICommand('llama', 'Meta Llama AI', 'llama'));
commands.push(createAICommand('deepseek', 'DeepSeek AI', 'deepseek'));
commands.push(createAICommand('mistral', 'Mistral AI', 'mistral'));
commands.push(createAICommand('blackbox', 'Blackbox AI', 'blackbox'));
commands.push(createAICommand('copilot', 'Microsoft Copilot', 'copilot'));
commands.push(createAICommand('openai', 'OpenAI ChatGPT', 'openai'));

// ==================== STORY GENERATOR ====================
commands.push({
    pattern: 'story',
    aliases: ['storygen', 'tellstory'],
    react: '📖',
    category: 'ai',
    description: 'Generate a story',
    async execute(context) {
        const { msg, args, reply, react, config } = context;
        
        if (!args.length) {
            return reply(`❌ Please provide a story prompt\nExample: ${config.PREFIX}story a brave knight`);
        }
        
        await react('📖');
        
        const prompt = args.join(' ');
        
        try {
            const ai = context.bot?.ai;
            const response = await ai.storygenAI?.(prompt) || 
                            await ai.meganAI(`Write a short story: ${prompt}`, msg.key.participant);
            
            await reply(response);
            await react('✅');
        } catch (error) {
            await reply(`❌ Error: ${error.message}`);
            await react('❌');
        }
    }
});

module.exports = commands;