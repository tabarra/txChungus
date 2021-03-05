//Requires
const modulename = 'destroy';
const axios = require("axios");
const { dir, log, logOk, logWarn, logError } = require('../lib/console')(modulename);

//Helpers
const anyUndefined = (...args) => { return [...args].some(x => (typeof x === 'undefined')) };

module.exports = {
    description: 'Insults a member.',
    async execute(message, args, config) {
        if (!message.mentions.users.size) {
            return message.reply('you need to tag a user in order to destroy them... fucktard');
        }
        const isSelfMentioned = message.mentions.users.filter((u) => u.id == message.client.user.id);
        if(isSelfMentioned.size){
            return message.reply('you really thought that was gonna work :joy:? https://tenor.com/view/cringe-compilation-cringe-comp-shrek-cringe-gif-11981921');
        }

        try {
            //perform request
            let reqUrl = `https://insult.mattbas.org/api/insult.json?who={{replace}}`;
            if(message.mentions.users.size > 1) reqUrl += '&plural';
            let resp = await axios.get(reqUrl, {timeout: 5000});
    
            //check response
            if(anyUndefined(resp.data, resp.data.error, resp.data.insult)) throw new Error('missing data');
            if(resp.data.error) throw new Error('detected error');

            //form insult and send
            const mentionString = message.mentions.users.map(x => `<@${x.id}>`).join(' ');
            const outMsg = resp.data.insult.replace('{{replace}}', mentionString);
            return message.channel.send(outMsg);

        } catch (error) {
            dir(error)
            return message.channel.send(`Destroy him yourself... idiot`);
        }
    },
};
