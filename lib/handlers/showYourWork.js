//Requires
const modulename = 'ShowYourWorkHandler';
const { dir, log, logOk, logWarn, logError } = require('../console')(modulename);


//Helpers
const scheduleDelete = async(message, delay = 15) => {
    if(!message.id) return;
    setTimeout(async () => {
        try {
            await message.delete();
        } catch (error) {
            logError(`Failed to delete message: [${message.author.tag}] ${message.content}`);
        }
    }, delay*1000);
}

const replyDelete = async(message, text, delay = 15) => {
    if(!message.id) return;
    try {
        scheduleDelete(message); 
        const outMsg = await message.reply(text);
        scheduleDelete(outMsg, delay);
    } catch (error) {
        logError(`Failed to reply to message: ${message.id}`)
    }
}


module.exports = ShowYourWorkHandler = async (message, txChungus) =>{
    //Ignoring admins.
    if(txChungus.config.commands.admins.includes(message.author.id)) return;

    //Parsing message
    const linksRegex = /(https?:\/\/\S+|discord\.gg\/\S+)/igm;
    const links = [...message.content.matchAll(linksRegex)].map(x => x[0]);
    const lines = message.content.split(/\n/);

    //Checking rules
    if(lines.length > 8 || links.length < 1 || links.length > 2){
        return replyDelete(message, `**⚠️ Your message will be deleted in 15 seconds! ⚠️**
Channel usage rules:
- Messages CANNOT have more than 2 links (ex: image, forum post, github, discord invite).
- Messages CANNOT be over 8 lines.`);
    }
    
    //Adding reactions
    try {
        message.react('🗳️');
        message.react('👍');
        message.react('👎');
    } catch (error) {
        logError(`Failed to react with message: ${error.message}`);
    }
}


/*



Test string
http://aaa.bb/ccc
https://xxx.yyy/zzz
se liga: discord.gg/kkkk
✨ https://discord.gg/fivem ✨


*/
