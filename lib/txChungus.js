//Requires
const fs = require('fs-extra');
const path = require("path");
const Discord = require("discord.js");
const Cron = require("./cron.js");
const chokidar = require('chokidar');
const stripAnsi = require('strip-ansi');
const leven = require('leven');
const { dir, log, logOk, logWarn, logError } = require('./console')();
const commandsFolderPath = 'commands';
const eventsFolderPath = 'events';

//NOTE: this shouldn't be a thing, but it is. Deal with it (:
global.GlobalData = {
    profile: null,
    commands: new Discord.Collection(),
    cmdStats: {},
    tempRoles: null,
    fxserverVersions: {}
}
//NOTE: this REALLY shouldn't be a thing, but i really don't cate
global.GlobalActions = {
    tmpRoleAdd: null,
    tmpRoleRemove: null,
}

/**
 * txChungus bot class
 */
module.exports = class txChungus {
    constructor(config, profile) {
        this.config = config;
        GlobalData.profile = profile;
        this.client = null;
        this.guild = null;
        this.announceChannel = null;
        this.selfHelpChannel = null;
        this.statsFile = `./data/stats_${GlobalData.profile}.json`;
        this.tempRolesFile = `./data/tempRoles_${GlobalData.profile}.json`;
        this.recentInfectedWarnings = []; //id of the users that were spreading malware, cleared every 5 mins

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
            //Statistics
            const statsJson = await fs.readFile(this.statsFile, 'utf8')
                .catch(() => {
                    fs.writeFile(this.statsFile, `[]`);
                    return []
                });
            if (!statsJson.length) {
                GlobalData.cmdStats = {};
                logOk(`Usage reset`);
            } else {
                GlobalData.cmdStats = JSON.parse(statsJson);
                logOk(`Loaded usage stats`);
            }

            //Temporary Roles
            const tempRolesJson = await fs.readFile(this.tempRolesFile, 'utf8')
                .catch(() => {
                    fs.writeFile(this.tempRolesFile, `[]`);
                    return []
                });
            if (!tempRolesJson.length) {
                GlobalData.tempRoles = [];
                logOk(`Temporary roles reset.`);
            } else {
                GlobalData.tempRoles = JSON.parse(tempRolesJson);
                logOk(`Temporary roles loaded.`);
            }
        } catch (error) {
            logError(`Failed to load data with error: ${error.message}`);
            process.exit(1);
        }
    }


    //================================================================
    async setupCommands () {
        //File commands
        const commandFiles = fs.readdirSync(commandsFolderPath);
        commandFiles.forEach(file => {
            this.setCommand(file);
            logOk(`Registered command: ${file}`);
        });

        //Default commands
        GlobalActions.tmpRoleAdd = async (role, id, expire, reason = null) => {
            if (GlobalData.tempRoles === null) return;
            if (!Object.keys(this.config.roles).includes(role)) throw new Error(`role not found`);

            // dir({
            //     SETTING_MEMBER_ROLE: role,
            //     id, expire, reason
            // })

            let member;
            try {
                member = await this.guild.members.fetch(id);
                if (member) {
                    await member.roles.add(this.config.roles[role]);
                }
            } catch (error) {
                if (error.code === 10007) { //"Unknown Member"
                    logWarn(`Member ${id} already left the guild.`);
                } else {
                    throw error;
                }
            }

            //This will overwrite the previous temp role for this user/role pair
            GlobalData.tempRoles = GlobalData.tempRoles.filter(t => !(t.id === id && t.role === role));
            GlobalData.tempRoles.push({ role, id, expire, reason });
            fs.writeFile(this.tempRolesFile, JSON.stringify(GlobalData.tempRoles, null, 2));
            return member;
        }
        GlobalActions.tmpRoleRemove = async (role, id) => {
            if (GlobalData.tempRoles === null) return;
            if (!Object.keys(this.config.roles).includes(role)) throw new Error(`role not found`);

            // dir({
            //     REMOVING_MEMBER_ROLE: role,
            //     id
            // })

            let member;
            try {
                member = await this.guild.members.fetch(id);
                if (member) {
                    await member.roles.remove(this.config.roles[role]);
                }
            } catch (error) {
                if (error.code === 10007) { //"Unknown Member"
                    logWarn(`Member ${id} already left the guild.`);
                } else {
                    throw error;
                }
            }

            GlobalData.tempRoles = GlobalData.tempRoles.filter(t => !(t.id === id && t.role === role));
            fs.writeFile(this.tempRolesFile, JSON.stringify(GlobalData.tempRoles, null, 2));
            return member;
        }
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
                if (line.startsWith('#alias')) {
                    const alias = line.substring('#alias '.length).trim();
                    return aliases.push(alias);
                } else if (line.startsWith('#file')) {
                    const file = line.substring('#file '.length).trim();
                    return files.push(file);
                } else {
                    messageLines.push(line)
                }
            });

            const command = {
                static: true,
                description: `Static reply for ${this.config.prefix}${fileInfo.name}`,
                aliases: aliases || [],
                async execute (message, args, config) {
                    const mentionString = message.mentions.users.map(x => `<@${x.id}>`).join(' ');
                    const msgWithMention = (mentionString) ? [mentionString, ...messageLines] : messageLines;
                    return message.channel.send(msgWithMention.join('\n'), { files });
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
            this.guild = await this.client.guilds.resolve(this.config.guild);
            if (!this.guild) {
                logError(`Guild not found: ${this.config.guild}`);
            }
            this.selfHelpChannel = await this.client.channels.resolve(this.config.channels.selfHelp.channel);
            if (!this.selfHelpChannel) {
                logError(`Self Help channel not found: ${this.config.channels.selfHelp.channel}`);
            }
            this.announceChannel = await this.client.channels.resolve(this.config.channels.general);
            if (!this.announceChannel) {
                logError(`Announcements channel not found: ${this.config.channels.general}`);
            }
            const outMsg = new Discord.MessageEmbed({
                color: 0x4287F5,
                description: `Hello, apparently I was dead for a sec, but now it's all fine... right?!`,
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
            !this.config.channels.general ||
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

        message.content = stripAnsi(message.content);

        //Block banned sites/words
        if (this.config.bannedStrings.filter((w) => message.content.toLowerCase().includes(w)).length) {
            if (message.deleted) {
                return;
            } else {
                logError(`${message.author.tag} posted a malware:`);
                logWarn(message.content);
                message.delete().catch(() => { });
                if (!this.recentInfectedWarnings.includes(message.author.id)) {
                    this.recentInfectedWarnings.push(message.author.id);
                    this.sendAnnouncement(`<@${message.author.id}> was infected by a malware that tried to spread itself in this guild.\n<https://youtu.be/NVIbCvfkO3E>`);
                    try {
                        const expiration = Date.now() + 120 * 60e3;
                        await GlobalActions.tmpRoleAdd('muted', message.author.id, expiration, 'spreading malware');
                    } catch (error) {
                        dir(error)
                    }
                }
            }
        }

        //Block steamcommunity scam
        const domains = message.content.match(/(\w{2,}\.\w{2,3}\.\w{2,3}|\w{2,})(?=\.\w{2,3})/gi)
        if (domains) {
            for (const domain of domains) {
                console.log(leven(domain, "steamcommunity"))
                if (leven(domain, "steamcommunity") <= 5 && domain !== "steamcommunity") {
                    logError(`${message.author.tag} posted a malware:`);
                    logWarn(message.content);
                    message.delete().catch(() => { });
                    if (!this.recentInfectedWarnings.includes(message.author.id)) {
                        this.recentInfectedWarnings.push(message.author.id);
                        this.sendAnnouncement(`<@${message.author.id}> was infected by a malware that tried to spread itself in this guild.\n<https://youtu.be/NVIbCvfkO3E>`);
                        try {
                            const expiration = Date.now() + 120 * 60e3;
                            await GlobalActions.tmpRoleAdd('muted', message.author.id, expiration, 'spreading malware');
                        } catch (error) {
                            dir(error)
                        }
                    }
                }
            }
        }

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
