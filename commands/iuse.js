//Requires
const modulename = 'iuse';
const fs = require('fs');
const { MessageEmbed } = require("discord.js");
const { dir, log, logOk, logWarn, logError } = require('../lib/console')(modulename);

//Consts & vars
const dataFile = `./data/recommendations_${GlobalData.profile}.json`;
const maxRecommendations = 10;
let recommendations;
let targetMessage;

//Get file data
try {
    const rawJson = fs.readFileSync(dataFile, 'utf8');
    if(!rawJson.length){
        recommendations = [];
        log(`Artifact recommendations reset.`);
    }else{
        recommendations = JSON.parse(rawJson).slice(-maxRecommendations);
        log(`Artifact recommendations loaded.`);
    }
} catch (error) {
    logError(`Failed to load artifact recommendations data with error: ${error.message}`);
    process.exit(1);
}


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
        const outMsg = await message.reply(text);
        scheduleDelete(outMsg, delay);
    } catch (error) {
        logError(`Failed to reply to message: ${message.id}`)
    }
}

/**
 * Usage:
 *  - open the recommended channel and delete all messages 
 *  - send some bot command (ex !help)
 *  - copy this message id and channel id
 *  - set up the recommendedBuild config
 */
module.exports = {
    description: 'recommends a fxserver artifact.',
    async execute(message, args, config) {
        //Sanity check
        if(!config.recommendedBuild.channel || !config.recommendedBuild.message){
            return logWarn(`recommendedBuild.channel or recommendedBuild.message not set`)
        }

        //Check channel ID
        if(message.channel.id !== config.recommendedBuild.channel){
            return message.reply(`please check <#${config.recommendedBuild.channel}>`);
        }

        //Check argument
        const buildNum = parseInt(args[0]);
        if(isNaN(buildNum)){
            scheduleDelete(message); 
            return replyDelete(message, `the correct usage is \`!iuse 1234\``);
        }

        //Check for invalid numbers
        if(buildNum < GlobalData.fxserverVersions.windows.critical){
            scheduleDelete(message); 
            return replyDelete(message, `this is below the latest critical build, you idiot.`);
        }
        if(buildNum > GlobalData.fxserverVersions.windows.latest){
            scheduleDelete(message); 
            return replyDelete(message, `this is above the latest build.`);
        }

        //Adds recommendation and trims array
        recommendations = recommendations.filter(rec => rec.author !== message.author.id)
        recommendations.push({
            nick: message.author.tag,
            author: message.author.id,
            build: buildNum
        });
        if(recommendations.length >= maxRecommendations){
            recommendations = recommendations.slice(-maxRecommendations);
        }

        //Saves data
        try {
            fs.writeFileSync(dataFile, JSON.stringify(recommendations, null, 2), 'utf8');
        } catch (error) {
            dir(error);
            return replyDelete(message, `Well, error...`);
        }

        //Process numbers
        const counter = {};
        recommendations.forEach(rec => {
            counter[rec.build] = (counter[rec.build])? counter[rec.build] +1 : 1;
        });
        let recsTable = Object.entries(counter);
        let top3;
        if(recsTable.length < 3){
            top3 = `Not enough data yet :frowning:`;
        }else{
            const orderedRecs = recsTable.sort((a, b) => {
                if(a[1] < b[1]){
                    return 1;
                }
                if(a[1] > b[1]){
                    return -1;
                }
                return 0;
            });
            top3 = [
                `:first_place: **${orderedRecs[0][0]}** (votes: ${orderedRecs[0][1]})`,
                `:second_place: **${orderedRecs[1][0]}** (votes: ${orderedRecs[1][1]})`,
                `:third_place: **${orderedRecs[2][0]}** (votes: ${orderedRecs[2][1]})`,
            ].join('\n')
        }

        //Creates message
        const tmpShit = new MessageEmbed({
            color: 0x69E0B9,
            title: "Recommended FXServer Artifact/Build",
            thumbnail: {
                url: "https://i.imgur.com/57hsnZ4.png"
            },
            description: `Please vote the build that you use and consider most stable.\nThis is a croudsourced fxserver build recomendation post based on the last **${maxRecommendations}** recommendations.`,
            fields: [
                {
                    name: " How to vote:",
                    value: "`!iuse <number>`"
                },
                {
                    name: "Results:",
                    value: top3
                },
                {
                    name: "Last 5 recommendations:",
                    value: recommendations.slice(-5).reverse().map(x => x.build).join(', ')
                }
            ]
        });

        //React & Delete command usage
        try {
            scheduleDelete(message); 
            await message.react('✅');
        } catch (error) {
            dir(error)
            return replyDelete(message, `Well, I failed to react to your message...`);
        }

        //Fetch target message
        if(!targetMessage){
            try {
                targetMessage = await message.channel.messages.fetch(config.recommendedBuild.message);
            } catch (error) {
                dir(error)
                return replyDelete(message, `whoops, shit failed...`);
            }
        }
        return await targetMessage.edit(tmpShit);
    }
};
