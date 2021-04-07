//Requires
const modulename = 'mute';
const { dir, log, logOk, logWarn, logError } = require('../lib/console')(modulename);

const validTimes = { m: 60000, h: 3600000, d: 86400000, w: 604800000 }

const parseTime = (str) => {
    // creds go to goat and me
    const match = str.match(/(\d+)\s?([mdhsw])/)
    if (match && validTimes[match[2]]) {
        return parseInt(match[1] * validTimes[match[2]])
    }
    return
}

module.exports = {
    description: 'Mutes a person for x amount of time',
    async execute(message, args, config) {
        //Check permission
        if (!config.admins.includes(message.author.id)) {
            return message.reply(`You're not allowed to use this command`);
        }

        const mention = message.mentions.members.first();
        if (!mention || !args[1]) return message.reply('Please use the correct command format. `!mute @mention 1d/1h/1m reason`');
        if (mention.user.id === message.author.id) return message.reply('u brainlet...');
        if (GlobalData.mutes.find(mute => mute.id == mention.id)) return message.reply('This person is already muted');

        const parsedTime = parseTime(args[1]);
        if (!parsedTime) return message.channel.send('Invalid time dumbass');
        const reason = args.slice(2).join(" ") || 'No reason specified';

        mention.roles.add(config.mutedRole).catch(() => message.channel.send('Something terrible just happened, fuck. Most likely missing permissions'));

        GlobalData.addMute({ id: mention.user.id, expire: Date.now() + parsedTime, reason });
        message.channel.send(`Muted \`${mention.displayName}\` for \`${args[1]}\`\nReason: \`${reason}\``);
        mention.send(`You have been muted for \`${args[1]}\`\nReason: \`${reason}\``).catch(() => logWarn("Failed to send a dm, propably disabled dms"));
    }
};