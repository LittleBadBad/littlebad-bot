import {Config} from "oicq/lib/client";

export interface QQBotConfig {
    /**
     * 机器人QQ号
     * */
    qq: number
    managers: number[]
    dataPath?: string
    password?: string

    others?: Config
}

export interface GuildBotConfig {
    appID: string, // 申请机器人时获取到的机器人ID
    token: string, // 申请机器人时获取到的机器人token
    sandbox: boolean
    shards: number[],
    intents: string[],// 事件订阅,用于开启可接收的消息类型
}

export interface BasePluginConfig {
    name?: string
}

export interface RedirectConfig extends BasePluginConfig {

    /**
     * 可用接收消息的群
     * */
    availableGroups: Array<number>

    /**
     * 会话生命时长
     * */
    sessionLife?: number

    /**
     * 值班成员列表
     */
    admins: Array<number>
}

export enum WaifuURLs {
    api_waifu_im = "api_waifu_im",
    waifu_vercel_app = "waifu_vercel_app"
}

export interface SetuConfig extends BasePluginConfig {
    seseGroups?: number[]
    lockTime?: number
    maxTime?: number
    dataFile?: string
    waifuURLs?: WaifuURLs[]
}

export type DutyMember = {
    uid: number
    name: string
}

export interface DutyConfig extends BasePluginConfig {
    dutyName: string
    members: DutyMember[]
    managers: number[]
}
