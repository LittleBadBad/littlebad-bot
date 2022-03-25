const {CallDaddy, createBot, DutyReminder, RedirectBot, SetuBot, ThumbUpBot} = require("littlebad-bot");

const nameList = "妍妍\t1287299719\n"

const members = nameList.split("\n").filter(v => v !== "").map(v => {
    const [name, uid] = v.split("\t")
    return {
        name,
        uid: parseInt(uid)
    }
})

const bot = createBot({
    qq: 123456,
    managers: [1287299719],
    dataPath: "botData/"+123456
})

bot.use(new RedirectBot({
    availableGroups: [],
    admins: members.map(v => v.uid)
}))
bot.use(new SetuBot())
bot.use(new ThumbUpBot())
bot.use(new CallDaddy())
bot.use(new DutyReminder({
    dutyName: "日常值班",
    members,
    manager: []
}))
bot.start()
