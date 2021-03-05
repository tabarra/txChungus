//Requires
const modulename = 'prune';
const { dir, log, logOk, logWarn, logError } = require('../lib/console')(modulename);

module.exports = {
    description: 'deletes X messages.',
    aliases: ['delete', 'purge'],
    async execute(message, args, config) {
        //Check permission
        if(!config.admins.includes(message.author.id)){
            return message.reply(`Your aren't an admin :clown:`);
        }

        //Check amount
        const amount = parseInt(args[0]) + 1;
        if (isNaN(amount)) {
            return message.reply(`that doesn't seem to be a valid number.`);
        } else if (amount <= 1 || amount > 100) {
            return message.reply(`you need to input a number between 1 and 99.`);
        }

        //Attempt to delete in bulk
        try {
            await message.channel.bulkDelete(amount, true)
        } catch (error) {
            dir(error)
            return message.reply(`well, apparently I can't.`);
        }
    }
};
