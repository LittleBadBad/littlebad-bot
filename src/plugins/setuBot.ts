import {BasePlugin, SetuConfig, WaifuURLs} from "../types";
import {Client, GroupMessageEvent} from "oicq";
import axios from "axios"
import {GuildMessageEvent} from "oicq/lib/internal/guild";
import * as fs from "fs";
import * as path from "path";
import {random_item} from "../utils";

const defaultImg = {
    "code": 200,
    "images": [{
        "file": "db0e8669c84c6d8a",
        "extension": ".png",
        "image_id": 2652,
        "favourites": 4,
        "dominant_color": "#d8b8be",
        "source": "https://reddit.com/l1pdos/",
        "uploaded_at": "2021-11-02T11:16:19.048684+00:00",
        "is_nsfw": false,
        "url": "https://cdn.waifu.im/db0e8669c84c6d8a.png",
        "preview_url": "https://waifu.im/preview/?image=db0e8669c84c6d8a.png",
        "tags": [{"tag_id": 12, "name": "waifu", "description": "A female anime/manga character.", "is_nsfw": false}]
    }]
}

type User = {
    uname: string
    gid: number
    uid: number
    endLockTime: number
    reqTime: number
    totalReq: number
}

export class SetuBot extends BasePlugin {
    name = "SetuBot"

    config: SetuConfig = {
        lockTime: 60 * 1000,
        maxTime: 5,
        seseGroups: [949658261, 618572409],
        waifuURLs: [WaifuURLs.api_waifu_im, WaifuURLs.waifu_vercel_app]
    }

    setu = ["色图", "setu", "涩图", "瑟图", "不能发的"]
    normal = ["二次元图片", "来点二次元", "二刺螈图片"]
    rank = ["色色排行", "瑟瑟排行"]
    gif = ["动图", "会动的"]
    delRec = ["删除记录"]
    orderKeys = [...this.setu, ...this.normal, ...this.rank, ...this.gif, ...this.delRec]
    users: User[] = []
    usersData: string

    orders = [
        this.getWaifu.bind(this),
        this.deleteRec.bind(this),
        this.getRank.bind(this)
    ]

    isOrder(e: any) {
        return super.isOrder(e) && (e.group || (this.managers.indexOf(e.sender.user_id) > -1))
    }

    onInstall(client: Client, managers, dataPath) {
        super.onInstall(client, managers, dataPath);
        return fs.promises.mkdir(this.dataPath, {recursive: true})
            .then(r => this.usersData = path.join(this.dataPath, "users.json"))
            .then(r => this.initData())
    }

    initData() {
        return fs.promises.readFile(this.usersData)
            .then(data => JSON.parse(data.toString()))
            .then(d => this.users = Array.isArray(d) ? d : [])
            .catch(e => this.users = [])
    }

    updateData() {
        return fs.promises.writeFile(this.usersData, JSON.stringify(this.users))
            .catch(err => console.log("[error] updateData ", err))
    }

    constructor(config?: SetuConfig) {
        super();
        this.config = {...this.config, ...config}
    }

    api_waifu_im(nsfw = false, gif = false) {
        return axios.get(`https://api.waifu.im/random/?is_nsfw=${nsfw}&gif=${gif}`)
            .catch(e => ({data: defaultImg}))
            .then(r => {
                console.log("img ", r.data)
                return r.data.images[0].url
            }).catch(e => "https://cdn.waifu.im/db0e8669c84c6d8a.png")
    }

    waifu_vercel_app(nsfw = false, gif = false) {
        const c1 = ["waifu", "neko", "shinobu", "megumin", "bully", "cuddle", "cry", "hug", "awoo", "kiss", "lick", "pat", "smug", "bonk", "yeet", "blush", "smile", "wave", "highfive", "handhold", "nom", "bite", "glomp", "slap", "kill", "kick", "happy", "wink", "poke", "dance", "cringe"]
        const c2 = ["waifu", "neko", "trap", "blowjob"]
        return `https://waifu.vercel.app/${nsfw ? 'nsfw' : 'sfw'}/${nsfw ? random_item(c2) : random_item(c1)}`
    }

    getRandomImageUrl(nsfw = false, gif = false) {
        return this[random_item(this.config.waifuURLs)](nsfw, gif)

    }

    isLegitimate(uid, uname, gid) {
        const u = this.users.find(v => v.uid === uid && v.gid === gid)
        if (u) {
            if (u.endLockTime > new Date().getTime()) {
                if (u.reqTime < this.config.maxTime) {
                    u.reqTime++
                    return true
                } else {
                    return false
                }
            } else {
                u.reqTime = 1
                u.endLockTime = new Date().getTime() + this.config.lockTime
                u.uname = uname
                return true
            }
        } else {
            this.users.push({
                uid,
                uname,
                gid,
                endLockTime: new Date().getTime() + this.config.lockTime,
                reqTime: 1,
                totalReq: 0
            })
            return true
        }
    }

    getRank(e: GroupMessageEvent) {
        const gid = e.group?.group_id
        const rawMsg = e.raw_message
        if (this.triggerKey(rawMsg, this.rank)) {
            return e.reply(this.users.filter(v => gid ? v.gid === gid : true)
                .sort((a, b) => b.totalReq - a.totalReq)
                .map(v => `@${v.uname}${gid ? "" : v.gid}：${v.totalReq}次`).join("\n"))
                .catch(e => console.log("[error] SetuBot onGroupMsg", e))
        }
    }

    deleteRec(e: GroupMessageEvent) {
        const uid = e.sender.user_id
        const rawMsg = e.raw_message
        if (this.triggerKey(rawMsg, this.delRec) && this.managers.indexOf(uid) > -1) {
            return this.users.find(v => v.uid === e.sender.user_id && v.gid === e.group?.group_id)!.totalReq = 0
        }
    }

    getWaifu(e: GroupMessageEvent) {
        const gid = e.group?.group_id
        const uid = e.sender.user_id
        const uname = e.sender.nickname
        const rawMsg = e.raw_message
        if (this.triggerKey(rawMsg, [...this.setu, ...this.normal, ...this.gif])) {
            if (this.isLegitimate(uid, uname, gid)) {
                let nsfw = false, gif = false, pre = "在发了在发了"
                if (this.triggerKey(rawMsg, this.setu)) {
                    nsfw = this.config.seseGroups.indexOf(gid) > -1 || this.managers.indexOf(uid) > -1
                    pre = nsfw ? "可以色色" : "不可以色色，去949658261色色"
                }
                if (this.triggerKey(rawMsg, this.gif)) {
                    gif = true
                }
                return e.reply(pre)
                    .catch(e => {
                        console.log("[error] SetuBot onGroupMsg", e)
                    })
                    .then(() => this.getRandomImageUrl(nsfw, gif))
                    .then(r => e.reply({
                        type: "image",
                        file: r
                    })
                        .then(r => this.users.find(v => v.uid === uid && v.gid === gid).totalReq++)
                        .then(r => this.updateData())
                        .catch(e => {
                            console.log("[error] SetuBot onGroupMsg", e)
                        }))
            } else {
                return e.reply(`30s内已涩了${this.config.maxTime}次了，休息一下再涩`).catch(e => {
                    console.log("[error] SetuBot onGroupMsg", e)
                })
            }
        }
    }

    async onGuildMessage(e: GuildMessageEvent) {
        super.onGuildMessage(e);
    }
}
