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

    onMessage() {

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
            case "guild.message":
            case "message":

        }
    }
}

export function createGuildClient(config) {
    return new ChannelBot(config)
}
