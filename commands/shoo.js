//Requires
const modulename = 'shoo';
const { dir, log, logOk, logWarn, logError } = require('../lib/console')(modulename);
const { txChungus } = require('../lib/txChungus');
const locations = new Map()
locations.set("tx", "589106731376836608") //#txadmin-help
locations.set("zap", "827624202625744956") //zap
locations.set("fx", "766868363041046589") //fxserver-help
locations.set("res", "766868150590505011") //resource-help
locations.set("pt", "603627795717029910") //porto
module.exports = {
    description: 'Tells a person that he is at the wrong place',
    async execute(message, args, config) {
        //Check permission
        if (!config.admins.includes(message.author.id)) {
            return message.reply(`You're not allowed to use this command`);
        }
        message.channel.send(`Let me fix up your brain`);
        const mention = message.mentions.members.first();
        if (!mention || !args[1]) return message.reply('Please use the correct command format. `!shoo @mention tx/fx/res/zap/pt`');
        if (mention.user.id === message.author.id) return message.reply('lol what'); //user trying to shoo himself
        if (mention.user.id === message.client.user.id) return message.reply('dont think so'); //user trying to shoo chungus

        const location = args[1]
        if (locations.has(location)) {
            message.guild.channels.cache.get(locations.get(location)).send(`<@${mention.id}>\n Hey bro, try asking your question here!`)
            message.channel.send("User directed to good channel")
        } else {
            if (!location) {
                message.channel.send("Wrong argument dumbass")
            } else {
                message.channel.send("No 2nd argument wtf")
            }
        }

    }
};