import {BasePlugin} from "../types";
import {GroupMessageEvent, PrivateMessageEvent} from "oicq";

export class ThumbUpBot extends BasePlugin {
    name = "ThumbUpBot"
    orderKeys = ["赞我"]

    isOrder(e: PrivateMessageEvent | GroupMessageEvent | any) {
        return this.orderKeys.find(v => e.raw_message.indexOf(v) > -1) && true
    }

    async onOrder(e: PrivateMessageEvent | GroupMessageEvent): Promise<any> {
        super.onOrder(e);
        const uid = e.sender.user_id
        const client = this.client
        client.sendLike(uid, 200).then(r => {
            return e.reply("赞了200次")
        }).catch(e => {
            console.error("[error] ThumbUpBot ", e)
        })
    }
}
