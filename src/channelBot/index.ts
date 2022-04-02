import {Friend} from "oicq/lib/friend";
import {GuildBotConfig} from "@src/types";
import {createOpenAPI, createWebsocket, IOpenAPI} from "qq-guild-bot"


class ChannelBot {

    config: GuildBotConfig = {
        appID: "",
        token: "",
        intents: [
            "GUILDS",
            "GUILD_MEMBERS",
            "GUILD_MESSAGES",
            "GUILD_MESSAGE_REACTIONS",
            "DIRECT_MESSAGE",
            "AUDIO_ACTION",
            "AT_MESSAGES",
            "MESSAGE_AUDIT"
        ],
        sandbox: true,
        shards: [0, 1]
    }
    api: IOpenAPI
    ws

    constructor(config) {
        const client = createOpenAPI(config);
        const ws = createWebsocket(config);
        this.config = config
        this.api = client
        this.ws = ws
        this.createListener()
    }

    createListener() {
        const ws = this.ws

        ws.on('ERROR', data => {
            console.log('[ERROR] 事件接收 :', data);
        });
        ws.on('GUILDS', data => {
            console.log('[GUILDS] 事件接收 :', data);
        });
        ws.on('GUILD_MEMBERS', data => {
            console.log('[GUILD_MEMBERS] 事件接收 :', data);
        });
        ws.on('DIRECT_MESSAGE', data => {
            console.log('[DIRECT_MESSAGE] 事件接收 :', data);
        });
        ws.on('AUDIO_ACTION', data => {
            console.log('[AUDIO_ACTION] 事件接收 :', data);
        });
        ws.on('AT_MESSAGES', data => {
            console.log('[AT_MESSAGES] 事件接收 :', data);
        });
    }

    sendTempMsg(channelId: number, uid: number, message) {

    }

    sendPrivateMsg(uid: number, message) {

    }

    sendGroupMsg(channelId: number, message) {

    }

    setGroupName(channelId: number, name: string) {

    }

    setGroupPortrait(channelId: number, avatar: string) {

    }

    sendLike(uid: number, time: number) {

    }

    pickFriend(uid: number): Friend {
        return
    }

    onMessage(listener) {
        this.ws.on("GUILD_MESSAGES", (data) => {
            const api = this.api
            const msg = {
                group: data.msg.channel_id,
                group_id: data.msg.channel_id,
                group_name: "",
                index: data.msg.seq_in_channel,
                message: data.msg.attachments.map(v => ({type: "image", url: v.url})),
                message_id: data.msg.id,
                message_type: "group",
                post_type: "message",
                rand: data.msg.edited_timestamp,
                raw_message: data.msg.content,
                sender: {
                    nickname: data.msg.author.username,
                    user_id: data.msg.author.id
                },
                seq: data.msg.seq_in_channel,
                time: data.msg.timestamp,
                recall(): Promise<any> {
                    return api.messageApi.deleteMessage(data.msg.channel_id, data.msg.id);
                },
                reply(content: any, quote?: boolean): Promise<any> {
                    return api.messageApi.postMessage(data.msg.channel_id, {
                        msg_id: data.msg.id,
                        content: content
                    });
                }
            }
            listener(msg)
        })
    }

    on(name: "system.online" |
           "message" |
           "guild.message" | "system.login.qrcode",
       listener: ((this: this, ...args: any[]) => void)) {
        const ws = this.ws
        switch (name) {
            case "system.online":
                ws.on('READY', listener);
                break;
            case "message":
                break;
            default:
                break;
        }
    }
}

export function createGuildClient(config) {
    return new ChannelBot(config)
}
