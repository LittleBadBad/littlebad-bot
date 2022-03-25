import {BasePlugin} from "../types";

export class CallDaddy extends BasePlugin {
    name = "CallDaddy"

    async onMessage(e: any) {
        if (e.raw_message.indexOf("叫爸爸") > -1 && this.managers.indexOf(e.sender.user_id) > -1) {
            return e.reply("爸爸", true)
        }
        if (e.raw_message.indexOf("叫妈妈") > -1 && this.managers.indexOf(e.sender.user_id) > -1) {
            return e.reply("妈妈", true)
        }
    }
}
