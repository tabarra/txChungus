//Requires
const fs = require('fs-extra');
const path = require("path");
const Discord = require("discord.js");
const Cron = require("./cron.js");
const chokidar = require('chokidar');
const { dir, log, logOk, logWarn, logError } = require('./console')();
const commandsFolderPath = 'commands';
const eventsFolderPath = 'events';

//NOTE: this shouldn't be a thing, but it is. Deal with it (:
global.GlobalData = {
    profile: null,
    commands: new Discord.Collection(),
    cmdStats: {},
    fxserverVersions: {}
}

/**
 * txChungus bot class
 */
module.exports = class txChungus {
    constructor(config, profile) {
        this.config = config;
        GlobalData.profile = profile;
        this.client = null;
        this.announceChannel = null;
        log('Starting...');
        this.setupData();
        this.setupCommands();
        this.setupWatcher();
        this.startBot();
        this.handlers = {
            deleted: require('./handlers/deleted'),
            recommendedBuild: require('./handlers/recommendedBuild'),
            showYourWork: require('./handlers/showYourWork'),
            directMessages: require('./handlers/directMessages'),
            general: require('./handlers/general'),
        }
        this.cron = new Cron(this);
    }


    //================================================================
    async setupData () {
        try {
            // If fs.readFile fails to find a the file create new file so it doesn't throw an error
            const rawJson = await fs.readFile(`./data/stats_${GlobalData.profile}.json`, 'utf8').catch(() => { fs.writeFile(`./data/stats_${GlobalData.profile}.json`, `[]`); return [] });
            if (!rawJson.length) {
                GlobalData.cmdStats = {};
                logOk(`Usage reset`);
            } else {
                GlobalData.cmdStats = JSON.parse(rawJson);
                logOk(`Loaded usage stats`);
            }

            const mutedJson = await fs.readFile(`./data/mutes_${GlobalData.profile}.json`, 'utf8').catch(() => { fs.writeFile(`./data/mutes_${GlobalData.profile}.json`, `[]`); return [] });
            if (!mutedJson.length) {
                GlobalData.mutes = [];
                logOk(`Mute reset`);
            } else {
                GlobalData.mutes = JSON.parse(mutedJson);
                logOk(`Loaded mutes`);
            }

            //FIXME: blame this on poggu, not me!
            GlobalData.addMute = (data) => {
                GlobalData.mutes.push(data);
                fs.writeFile(`./data/mutes_${GlobalData.profile}.json`, JSON.stringify(GlobalData.mutes));
            }
            GlobalData.removeMute = (id) => {
                GlobalData.mutes = GlobalData.mutes.filter(mute => mute.id !== id);
                fs.writeFile(`./data/mutes_${GlobalData.profile}.json`, JSON.stringify(GlobalData.mutes));
            }

        } catch (error) {
            logError(`Failed to load data with error: ${error.message}`);
            process.exit(1);
        }
    }


    //================================================================
    async setupCommands () {
        const commandFiles = fs.readdirSync(commandsFolderPath);

        commandFiles.forEach(file => {
            this.setCommand(file);
            logOk(`Registered command: ${file}`);
        });
        // dir(GlobalData.commands)
    }

    //================================================================
    async setCommand (file) {
        const filePath = path.resolve(commandsFolderPath, file);
        const fileInfo = path.parse(file);

        if (fileInfo.ext == '.js') {
            const command = require(filePath);
            delete require.cache[require.resolve(filePath)];
            GlobalData.commands.set(fileInfo.name, command);

        } else if (fileInfo.ext == '.txt') {
            const rawFile = fs.readFileSync(filePath, 'utf8');

            const messageLines = [];
            const aliases = [];
            const files = [];
            rawFile.split('\n').forEach(line => {
                if(line.startsWith('#alias')){
                    const alias = line.substring('#alias '.length).trim();
                    return aliases.push(alias);
                }else if(line.startsWith('#file')){
                    const file = line.substring('#file '.length).trim();
                    return files.push(file);
                }else{
                    messageLines.push(line)
                }
            });
            
            const command = {
                static: true,
                description: `Static reply for ${this.config.prefix}${fileInfo.name}`,
                aliases: aliases || [],
                async execute (message, args, config) {
                    const mentionString = message.mentions.users.map(x => `<@${x.id}>`).join(' ');
                    const msgWithMention = (mentionString)? [mentionString, ...messageLines] : messageLines;
                    return message.channel.send(msgWithMention.join('\n'), {files});
                },
            };
            GlobalData.commands.set(fileInfo.name, command);

        } else {
            return logError(`Unknown format: ${file}`);
        }
    }

    //================================================================

    /* Watch commands folder */
    async setupWatcher () {
        const watcher = chokidar.watch(commandsFolderPath, { persistent: true })
        watcher.on('change', file => {
            this.setCommand(file.replace('commands\\', ''));
            logOk(`File ${file} has changed, refreshing command!`);
        })
    }


    //================================================================
    async startBot () {
        //Setup client
        this.client = new Discord.Client({
            disableMentions: 'everyone',
            autoReconnect: true
        });

        //Setup event listeners

        this.client.on('ready', async () => {
            logOk(`Started and logged in as '${this.client.user.tag}'`);
            this.client.user.setActivity('you guys', { type: 'WATCHING' });
            this.announceChannel = await this.client.channels.resolve(this.config.channels.announce);
            // this.announceChannel = await this.client.channels.resolve('665663901907812372');
            if (!this.announceChannel) {
                logError(`Announcements channel not found: ${this.config.channels.announce}`);
            }
            const outMsg = new Discord.MessageEmbed({
                color: 0x4287F5,
                description: `hello`,
            });
            this.sendAnnouncement(outMsg);
            this.setupEvents();
        });
        this.client.on('message', this.messageHandler.bind(this));
        this.client.on('messageDelete', this.messageHandler.bind(this));
        this.client.on('error', (error) => {
            logError(error.message);
        });
        this.client.on('resume', (error) => {
            logOk('Connection with Discord API server resumed');
        });


        //Start bot
        try {
            await this.client.login(this.config.token);
        } catch (error) {
            logError(error.message);
            process.exit();
        }
    }

    //================================================================

    async setupEvents () {
        const eventFiles = fs.readdirSync(eventsFolderPath);

        eventFiles.forEach(file => {
            const filePath = path.resolve(eventsFolderPath, file);
            const fileInfo = path.parse(file);

            if (fileInfo.ext == '.js') {
                const event = require(filePath);
                // If someone is scrubbing their head because of the this mess in .bind take a look here https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Function/bind#Parameters
                // The first argument in .bind represents the this from the callback function this.client.on returns and the other parameters are just additional params that don't have the same this scope as the first parameters
                this.client.on(fileInfo.name, event.execute.bind(this, this.config))
            } else {
                return logError(`Unknown format: ${file}`);
            }

            logOk(`Registered event: ${file}`);
        });
    }


    //================================================================
    async sendAnnouncement (message) {
        if (
            !this.config.channels.announce ||
            !this.client ||
            this.client.ws.status ||
            !this.announceChannel
        ) {
            logWarn(`returning false, not ready yet`, 'sendAnnouncement');
            return false;
        }

        try {
            this.announceChannel.send(message);
        } catch (error) {
            logError(`Error sending Discord announcement: ${error.message}`);
        }
    }//Final sendAnnouncement()


    //================================================================
    async addUsageStats (cmd) {
        GlobalData.cmdStats[cmd] = (typeof GlobalData.cmdStats[cmd] == 'undefined') ? 1 : GlobalData.cmdStats[cmd] + 1;
        try {
            const rawJson = JSON.stringify(GlobalData.cmdStats, null, 2);
            await fs.writeFile(`./data/stats_${GlobalData.profile}.json`, rawJson, 'utf8');
        } catch (error) {
            logError(`Failed to save stats file with error: ${error.message}`);
        }
    }//Final addUsageStats()


    //================================================================
    async messageHandler (message) {
        //Handler filter
        if (message.author.bot) return;
        if (message.guild && message.guild.id !== this.config.guild) return;

        //Handler selection
        if (message.deleted) {
            this.handlers.deleted(message, this);

        } else if (message.channel.id == this.config.channels.recommendedBuild.channel) {
            this.handlers.recommendedBuild(message, this);

        } else if (message.channel.id == this.config.channels.showYourWork) {
            this.handlers.showYourWork(message, this);

        } else if (message.channel.type == 'dm') {
            this.handlers.directMessages(message, this);

        } else if (message.channel.type == 'text') {
            this.handlers.general(message, this);

        } else {
            logWarn(`HandlerNotFound for message from ${message.author.tag} in ${message.channel.name} (${message.channel.type})`);
        }
    }

} //Fim txChungus()