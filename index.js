//Requires
const { dir, log, logOk, logWarn, logError, cleanTerminal, setTTYTitle } = require('./lib/console')();

//Reset Terminal
cleanTerminal();
setTTYTitle();

//Import config and start bot
if(process.argv.length != 3){
    logError(`Usage: node index <profile>`);
    process.exit();
}
const profile = process.argv[2];
log(`Profile selected: ${profile}`);
const config = require(`./config/${profile}.json`);
const txChungus = require('./lib/txChungus')
const bot = new txChungus(config, profile);

//Handle "the unexpected"
process.on('unhandledRejection', (err) => {
    logError("Ohh Nooooo - unhandledRejection")
    logError(err.message)
    dir(err.stack)
});
process.on('uncaughtException', function(err) {
    logError("Ohh Nooooo - uncaughtException")
    logError(err.message)
    dir(err.stack)
});
process.on('exit', (code) => {
    log("Bitch I'm out...");
});
