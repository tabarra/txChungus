//From: https://rosettacode.org/wiki/Magic_8-Ball
const answers = [
    `It is certain`,
    `It is decidedly so`,
    `Without a doubt`,
    `Yes, definitely`,
    `You may rely on it`,
    `As I see it, yes`,
    `Most likely`,
    `Outlook good`,
    `Signs point to yes`,
    `Yes`,
    `Reply hazy, try again`,
    `Ask again later`,
    `Better not tell you now`,
    `Cannot predict now`,
    `Concentrate and ask again`,
    `Don't bet on it`,
    `My reply is no`,
    `My sources say no`,
    `Outlook not so good`,
    `Very doubtful`,
];
const shakingGif = `https://tenor.com/view/8ball-bart-simpson-shaking-shake-magic-ball-gif-17725278`;

module.exports = {
    rateLimit: {
        max: 1,
        resetTime: 30000, // in ms
        global: true // Rate limit individuals or everyone at once
    },
    description: 'Magic 8 ball knows everything.',
    async execute (message, args, config) {
        // return message.reply('shut the fuck up')
        const question = message.content.substring(message.content.indexOf(' ') + 1);
        const header = [
            `<@${message.author.id}> asked:`,
            `> ${question}`,
            `Magic 8 Ball says:`,
            `> `
        ].join('\n');
        const outMsg = await message.channel.send(header + shakingGif);
        const answer = answers[Math.floor(Math.random() * answers.length)];
        setTimeout(() => {
            outMsg.edit(`${header} **${answer}**`);
        }, 5000);
    },
};
