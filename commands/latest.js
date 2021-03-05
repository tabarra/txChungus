//Requires
const modulename = 'latest';
const { MessageEmbed } = require("discord.js");
const { dir, log, logOk, logWarn, logError } = require('../lib/console')(modulename);

//Helpers
const anyUndefined = (...args) => { return [...args].some(x => (typeof x === 'undefined')) };
const emojify = (src) => {
    let out = src.toString();
    out = out.replace(/0/g, ':zero:');
    out = out.replace(/1/g, ':one:');
    out = out.replace(/2/g, ':two:');
    out = out.replace(/3/g, ':three:');
    out = out.replace(/4/g, ':four:');
    out = out.replace(/5/g, ':five:');
    out = out.replace(/6/g, ':six:');
    out = out.replace(/7/g, ':seven:');
    out = out.replace(/8/g, ':eight:');
    out = out.replace(/9/g, ':nine:');
    return out;
}


module.exports = {
    description: 'Send instructions for the latest FXserver + txAdmin.',
    aliases: ['update'],
    async execute(message, args, config) {
        //Check if we have the data
        if (anyUndefined(
            GlobalData.fxserverVersions.windows,
            GlobalData.fxserverVersions.linux
        )) {
            return message.reply('IDK, FiveM stuff might be offline or something...');
        }

        //If mention
        let mentionString = '';
        if(message.mentions.users.size){
            mentionString = message.mentions.users.map(x => `<@${x.id}>`).join(' ');
        }

        //If !latest full
        if(args.length && args[0] == 'full'){
            const tplWindows = 'FXServer windows versions info:\n```json\n{{replace}}```\n';
            const outWindows = tplWindows.replace('{{replace}}', JSON.stringify(GlobalData.fxserverVersions.windows, null, 2));
            message.channel.send(outWindows);
            const tplLinux = 'FXServer linux versions info:\n```json\n{{replace}}```\n';
            const outLinux = tplLinux.replace('{{replace}}', JSON.stringify(GlobalData.fxserverVersions.linux, null, 2));
            message.channel.send(outLinux);
            return;
        }
        
        const updateMessage = `${mentionString} **To update to v3.3.0 you just need to update to artifact :three::five::zero::two:!**
Please use the two links below to download that _specific_ version:
<:windows:791692679419265044> https://runtime.fivem.net/artifacts/fivem/build_server_windows/master/3502-dbadcc2374d1eaa889563182ae8532ab56d7eb9d/server.zip
<:linux:780972840454979604> https://runtime.fivem.net/artifacts/fivem/build_proot_linux/master/3502-dbadcc2374d1eaa889563182ae8532ab56d7eb9d/fx.tar.xz
`;
        return message.channel.send(updateMessage);

        const gifs = [
            'https://tenor.com/view/shaquille-o-neal-excited-shaking-cant-wait-gif-13783587',
            'https://tenor.com/view/soon-okay-real-soon-very-quickly-in-a-second-just-a-moment-gif-15029375',
            'https://tenor.com/view/daddys-home2-daddys-home2gifs-jon-lithgow-reunion-waiting-gif-9683398',
            'https://tenor.com/view/cat-driving-serious-cat-driving-hold-on-gif-16076083',
            'https://tenor.com/view/judge-judy-double-time-faster-hurry-gif-7566976',
            'https://tenor.com/view/mr-bean-checking-time-waiting-gif-11570520',
            'https://tenor.com/view/off-work-almost-sleepy-gif-13396687',
        ]
        const gifLink = gifs[Math.floor(Math.random() * gifs.length)]

        // const updateMessage = `${mentionString} The v3.2.3 update will be available **19:00 BRT!** Stay tuned!`;
        // const updateMessage = `${mentionString} The v3.3.0 update will be available very _very_ very _very_ very _very_ soon! Stay tuned! \n${gifLink}`;
        // return message.channel.send(updateMessage);
        
        //Prepare message
        const manualUpdateText = `Download \`monitor.zip\` from the following link:
        https://github.com/tabarra/txAdmin/releases/latest
        Then inside the artifacts folder, replace the \`citizen/system_resources/monitor\` folder contents with the files from the downloaded ZIP.
        On Linux, this folder is inside \`alpine/opt/cfx-server/citizen/system_resources\`.
        **DON'T FORGET TO RESTART txAdmin!**`;

        //In case FXServer already have the latest txAdmin
        if(config.latestTXAdminVersionOnArtifact){
            let isRecentBuildMessage = '';
            if(config.latestTXAdminVersionOnArtifact + 32 > GlobalData.fxserverVersions.windows.latest){
                isRecentBuildMessage = 'Click on the **special link** below to see the latest artifact.';
            }
            const txVersionMsg = new MessageEmbed({
                color: 0x69E0B9,
                title: `👉 Latest txAdmin: ${config.latestTXAdminVersion}`,
                description: `It already comes with FXServer **${config.latestTXAdminVersionOnArtifact}** and above, so no need to download it separately! ${isRecentBuildMessage}`,
                fields: [
                    {
                        name: `📥 Latest Windows Artifact: ${emojify(GlobalData.fxserverVersions.windows.latest)}`,
                        value: GlobalData.fxserverVersions.windows.artifactsLink + '_fix_cache_' + GlobalData.fxserverVersions.windows.latest 
                    },
                    {
                        name: `📥 Latest Linux Artifact: ${emojify(GlobalData.fxserverVersions.linux.latest)}`,
                        value: GlobalData.fxserverVersions.linux.artifactsLink + '_fix_cache_' + GlobalData.fxserverVersions.linux.latest
                    },
                    {
                        name: "👉 Downloading separately from FXServer:",
                        value: manualUpdateText
                    },
                ]
            });
            return message.channel.send(mentionString, txVersionMsg);

        //In case this version is still not available with FXServer
        }else{
            const txVersionMsg = new MessageEmbed({
                color: 0x69E0B9,
                title: `👉 Latest txAdmin: ${config.latestTXAdminVersion}`,
                description: `The most recent txAdmin version is not yet present in the FXServer artifacts.\n${manualUpdateText}`
            });
            return message.channel.send(mentionString, txVersionMsg);
        }

    },
};


/*
    https://api.github.com/repos/tabarra/txAdmin/releases
    https://api.github.com/repos/tabarra/txAdmin/releaseslatest
    https://api.github.com/repos/citizenfx/fivem/commits
*/
