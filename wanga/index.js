/*
 * MEGAN-MD Commands Index
 * Exports all commands from individual files
 */

const general = require('./general');
const downloader = require('./downloader');
const converter = require('./converter');
const ai = require('./ai');
const group = require('./group');
const owner = require('./owner');
const tools = require('./tools');

// Combine all commands
const commands = [
    ...general,
    ...downloader,
    ...converter,
    ...ai,
    ...group,
    ...owner,
    ...tools
];

// Create command map for easy access
const commandMap = new Map();
const aliasMap = new Map();

commands.forEach(cmd => {
    if (cmd?.pattern) {
        commandMap.set(cmd.pattern, cmd);
        
        if (cmd.aliases) {
            cmd.aliases.forEach(alias => {
                aliasMap.set(alias, cmd.pattern);
            });
        }
    }
});

module.exports = {
    commands,
    commandMap,
    aliasMap
};