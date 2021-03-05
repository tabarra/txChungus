module.exports = {
    description: 'Mocks a member.',
    async execute(message, args, config) {
        if (!message.mentions.users.size) {
            return message.reply('you need to tag an user in order to mock them... fucktard');
        }
        const isSelfMentioned = message.mentions.users.filter((u) => u.id == message.client.user.id);
        if(isSelfMentioned.size){
            return message.reply('you really thought that was gonna work? https://tenor.com/view/cringe-compilation-cringe-comp-shrek-cringe-gif-11981921');
        }
        const profilePicture = message.mentions.users.first().displayAvatarURL({ format: "png", dynamic: true });
        return message.channel.send(`HaHaHaHa just look at his face!\n${profilePicture}`);
    },
};
