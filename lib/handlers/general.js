//Requires
const modulename = 'GeneralHandler';
const { dir, log, logOk, logWarn, logError } = require('../console')(modulename);
const inviteDate = new Map()
const inviteCount = new Map()
const lastMsg = new Map()
module.exports = GeneralHandler = async (message, txChungus) => {

    //Block banned sites/words
    if (txChungus.config.bannedStrings.filter((w) => message.content.includes(w)).length) {
        logError(`${message.author.tag} posted a blocked link:`);
        logWarn(message.content);
        message.delete().catch(() => { });
        return message.reply(`my dude, that's a blocked site!!!`);
    }
    if (message.content.match(new RegExp(/(dsc\.gg)|(discord\.gg)/, "i")) && !message.member.roles.cache.find(r =>  txChungus.config.trustedRoles.includes(r.id)) && message.channel.id != "766890135882825759") {
        console.log(inviteCount.get(message.author.id))
        console.log(inviteDate.get(message.author.id))
        const m = message.content.match("(?<=\.gg/).*") //check if anything after / and if so only delete then, this could lead to abusing but Ill let u guys decide that
        if (!inviteDate.has(message.author.id)) { 
            if (m) {
                inviteDate.set(message.author.id, Date.now())
                inviteCount.set(message.author.id, 1)
                lastMsg.set(message.author.id, m.toString())
            }
        } else {
            if (m) {
                if (m.toString() == lastMsg.get(message.author.id)) {
                    inviteCount.set(message.author.id, inviteCount.get(message.author.id) + 1)
                }
            }
        }

        if (inviteCount.get(message.author.id) >= 5 && inviteDate.get(message.author.id) > Date.now() - 60000) {
            if (m) {
                if (m.toString() == lastMsg.get(message.author.id)) {
                    message.delete()
                    }
            }
        } else {
            if (inviteDate.get(message.author.id) < Date.now() - 60000) {
                inviteCount.delete(message.author.id, 0)
                inviteDate.delete(message.author.id, 0)
            }
        }
    }
    
    //Check if its a command
    if (!message.content.startsWith(txChungus.config.prefix)) return;

    //Parse message & gets command
    const args = message.content.slice(txChungus.config.prefix.length).split(/\s+/);
    const commandName = args.shift().toLowerCase();
    const command = GlobalData.commands.get(commandName)
        || GlobalData.commands.find(cmd => cmd.aliases && cmd.aliases.includes(commandName));

    //Check if the command exists
    if (!command) return;

    /* Rate limiter */
    if (command.rateLimit?.max && command.rateLimit?.resetTime) {
        const limitData = command.limitData || { members: [] }
        let count = (command.rateLimit.global ? limitData.members?.global : limitData.members?.[message.author.id]) || 0;

        if (count >= command.rateLimit.max) {
            return message.channel.send(`You can use this command in ${command.rateLimit.resetTime / 1000} seconds`);
        }

        count++;

        setTimeout(() => {
            count--;
            if (count == 0) count = null;
            command.rateLimit.global ? limitData.members.global = count : limitData.members[message.author.id] = count;
        }, command.rateLimit.resetTime);

        command.rateLimit.global ? limitData.members.global = count : limitData.members[message.author.id] = count;
        command.limitData = limitData;
    }


    //Logs, adds to the stats
    log(`[${message.author.tag}] ${message.content}`);
    txChungus.addUsageStats(commandName);

    //Executes command
    try {
        command.execute(message, args, txChungus.config.commands);
    } catch (error) {
        logError(`Error executing ${commandName}: ${error.message}`);
    }

}
