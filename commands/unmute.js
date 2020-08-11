const fs = module.require("fs");

module.exports.run = async (bot, message, args) => {
    if(!message.member.hasPermission("MANAGE_MESSAGES")) return message.channel.send("You dont have the permission to unmute it dickhead!");
    let toMute = message.mentions.members.first() || message.guild.members.get(args[0]);
    if(!toMute) return message.channel.send("Gimme the user or the id!");
    if(toMute.highestRole.position >= message.member.highestRole.position) return message.channel.send("You can't mute a member with higher permissions.");
    let mutedRole = message.guild.roles.find(mR => mR.name === "muted");
    if(!mutedRole || !toMute.roles.has(mutedRole.id)) return message.channel.send("he's not muted fucking degenerate");
    await toMute.removeRole(mutedRole);
    member.removeRole(mutedRole);
    delete bot.muted[toMute.id];

    fs.writeFile("./commands/mutes.json", JSON.stringify(bot.muted), err => {
        if(err) throw err;
        message.channel.send(`My master. I unmuted: ${toMute.user.tag}!`);
    });
    
}

module.exports.help = {
    name: "unmute"
}