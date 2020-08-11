const fs = module.require("fs");

module.exports.run = async (bot, message, args) => {

    if(!message.member.hasPermission("MANAGE_MESSAGES")) return message.channel.send("You dont have the permission to mute it bitch!");
    let toMute = message.mentions.members.first() || message.guild.members.get(args[0]);
    if(!toMute) return message.channel.send("Gimme the user or the id!");
    if(toMute.id === message.author.id) return message.channel.send("Why for fuck's sake you're trying to mute urself?");
    if(toMute.highestRole.position >= message.member.highestRole.position) return message.channel.send("You can't mute a member with higher permissions.");

    let mutedRole = message.guild.roles.find(mR => mR.name === "muted");
    if(!mutedRole) {
        try {
            mutedRole = await message.guild.createRole({
                name: "muted",
                color: "#000000",
                permissions: []
            });
            message.guild.channels.forEach(async (channel, id) => {
                await channel.overwritePermissions(mutedRole, {
                    SEND_MESSAGES: false,
                    ADD_REACTIONS: false
                })
            });

        } catch(e) {
            console.log(e.stack);
        }
    }
    if(toMute.roles.has(mutedRole.id)) return message.channel.send("user already muted dumbass!");
    bot.muted[toMute.id] = {
        guild: message.guild.id,
        time: Date.now() + parseInt(args[1]) * 1000
    }
    await toMute.addRole(mutedRole);
    

    fs.writeFile("./commands/mutes.json", JSON.stringify(bot.muted, null, 4), err => {
        if(err) throw err;
        message.channel.send(`Alright sir. I muted: ${toMute.user.tag}!`);
    });

}

module.exports.help = {
    name: "mute"
}