//From: https://rosettacode.org/wiki/Magic_8-Ball
const answers = {
    "It is certain": 2,
    "It is decidedly so": 2,
    "Without a doubt": 2,
    "Yes, definitely": 2,
    "You may rely on it": 2,
    "As I see it, yes": 2,
    "Most likely": 2,
    "Outlook good": 2,
    "Signs point to yes": 2,
    "Yes": 2,
    "Reply hazy, try again": 1,
    "Ask again later": 1,
    "Better not tell you now": 1,
    "Cannot predict now": 1,
    "Concentrate and ask again": 1,
    "Don't bet on it": 2,
    "My reply is no": 2,
    "My sources say no": 2,
    "Outlook not so good": 2,
    "Very doubtful": 2
};
const shakingGif = `https://tenor.com/view/8ball-bart-simpson-shaking-shake-magic-ball-gif-17725278`;

function weightedRnd(input) {
    let arr = [];
    for (let item in input) {
        for (let i = 0; i < input[item]; i++) {
            arr.push(item);
        }
    }
    return arr[Math.floor(Math.random() * arr.length)];
}
module.exports = {
    rateLimit: {
        max: 1,
        resetTime: 30000, // in ms
        global: true // Rate limit individuals or everyone at once
    },
    description: 'Magic 8 ball knows everything.',
    async execute(message, args, config) {
        // return message.reply('shut the fuck up')
        const question = message.content.substring(message.content.indexOf(' ') + 1);
        const header = [
            `<@${message.author.id}> asked:`,
            `> ${question}`,
            `Magic 8 Ball says:`,
            `> `
        ].join('\n');
        const outMsg = await message.channel.send(header + shakingGif);
        const answer = weightedRnd(answers)
        setTimeout(() => {
            outMsg.edit(`${header} **${answer}**`);
        }, 5000);
    },
};