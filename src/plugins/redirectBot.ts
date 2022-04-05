import {BasePlugin, Redirect, RedirectConfig, SessionMap} from "../types";
import {Client, DiscussMessageEvent, GroupMessageEvent, PrivateMessageEvent} from "oicq";
import * as fs from "fs";
import * as path from "path";

export class RedirectBot extends BasePlugin {

    config: RedirectConfig
    msgQueue: Array<PrivateMessageEvent | GroupMessageEvent | DiscussMessageEvent>
    replyQueue: Array<number>
    sessionMap: SessionMap<string> | any

    endSession = ["结束会话", "结束回话", "结束对话"]
    openSession = ["开启会话", "开启回话", "开启对话"]

    mapFile = "session.json"
    orderKeys = [...this.endSession, ...this.openSession]
    name = "RedirectBot"

    orders = [
        this.callEndSession.bind(this),
        this.callStartSession.bind(this)
    ]

    onInstall(client: Client, managers, dataPath) {
        super.onInstall(client, managers, dataPath);
        return this.initMap()
    }

    initMap() {
        this.sessionMap = {}
        return fs.promises.mkdir(this.dataPath, {recursive: true})
            .then(() => fs.promises.readFile(path.join(this.dataPath, this.mapFile)))
            .then(r => {
                const sessionMap = JSON.parse(r.toString())
                for (const key of Object.keys(sessionMap)) {
                    if (this.config.availableGroups.indexOf(Number(key)) > -1) {
                        this.sessionMap[key] = sessionMap[key]
                    }
                }
            }).catch(e => {
                this.sessionMap = {}
            })
    }

    updateMap() {
        return fs.promises
            .writeFile(path.join(this.dataPath, this.mapFile), JSON.stringify(this.sessionMap))
            .catch(e => console.log("[error] RedirectBot updateMap", e))
    }

    constructor(config: RedirectConfig) {
        super()
        this.name = config.name || "RedirectBot"
        this.config = {sessionLife: 5 * 60 * 1000, ...config}
        this.msgQueue = []
    }

    /**
     * @deprecated
     */
    checkAvailableGroups() {
        const config = this.config
        config.availableGroups = config.availableGroups.filter(v => {
            return this.client.pickGroup(v).is_admin // 无法使用
        })
    }

    isOrder(e: any): boolean {
        return super.isOrder(e) &&
            (this.managers.indexOf(e.sender.user_id) > -1 || this.config.admins.indexOf(e.sender.user_id) > -1)
    }

    callEndSession(e: GroupMessageEvent) {
        const rawMsg = e.raw_message
        if (this.triggerKey(rawMsg, this.endSession)) {
            this.config.availableGroups.forEach(v => {
                if (rawMsg.indexOf(String(v)) > -1) {
                    this.sessionMap[v] = null
                }
            })
        }
    }

    callStartSession(e: GroupMessageEvent) {
        const rawMsg = e.raw_message
        const reflect = this.sessionMap
        if (this.triggerKey(rawMsg, this.openSession)) {
            const [create, uid] = rawMsg.split(/[\s]+/g), uid1 = parseInt(uid)
            if (e.group && uid) {
                let flag
                for (const gid in reflect) {
                    if (reflect[gid]?.qq === uid1) {
                        flag = true
                        break;
                    }
                }
                if (!flag) {
                    this.sessionMap[e.group.group_id] = null
                    this.updateSession(e.group.group_id, uid1)
                }
            }
        }
    }

    /**
     * 1. 优先当前会话
     * 2. 其次空会话
     * 寻找可用聊天群
     */
    findAvailableGroup(uid): number {
        const reflect = this.sessionMap
        for (let groupId of this.config.availableGroups) {
            const session: Redirect = reflect[groupId]
            if (uid === session?.qq) {
                return Number(groupId)
            }
        }
        for (let groupId of this.config.availableGroups) {
            if (this.isGroupFree(groupId)) {
                return Number(groupId)
            }
        }
        return null
    }

    /**
     * 检查该群是否空闲
     * 并将过期的会话
     * @param groupId
     */
    isGroupFree(groupId) {
        const reflect = this.sessionMap
        const session: Redirect = reflect[groupId]
        const expired = session &&/** 存在 */
            // this.replyQueue.indexOf(session.qq) === -1 &&/** 已回复 */
            session.endTime < new Date().getTime() /** 已过期 */
        if (expired) reflect[groupId] = null
        return !session ||/** 空*/
            expired/** 已过期*/
    }

    getQuoteMsg(pool: (PrivateMessageEvent | GroupMessageEvent | any)[][], quote: PrivateMessageEvent | GroupMessageEvent | any, toGroup = true) {
        if (pool && pool.length && quote) {
            for (const v of pool) {
                const [pr, gr] = v
                if (toGroup) {
                    if (pr.rand === quote.rand && pr.time === quote.time) {
                        return {
                            ...gr,
                            message: pr.message || gr.message,
                            user_id:pr.user_id || gr.user_id,
                        }
                    }
                } else {
                    if (gr.rand === quote.rand && gr.time === quote.time) {
                        return {
                            ...pr,
                            message: pr.message || gr.message,
                            user_id:pr.user_id || gr.user_id,
                        }
                    }
                }
            }
        }
        return null
    }

    postMsqQueue(e) {
        return new Promise((resolve, reject) => {
            return this.onPrivateMsg(e, true)
                .then(r => {
                    setTimeout(() => {
                        resolve(r)
                    }, 1000)
                }).catch(e => {
                    reject(e)
                })
        })
    }

    /** 处理消息队列
     * 每秒执行一次，若队列不为空，则以队列内发送状态执行私聊消息响应 onPrivateMsg，
     * 发送成功后，则将该消息移除队列
     * @see onPrivateMsg
     */
    async handleQueue() {
        while (this.msgQueue.length) {
            await this.postMsqQueue(this.msgQueue[0]).then(r => {
                if (r) {
                    this.msgQueue.splice(0, 1)
                }
            }).catch(e => {
                console.log("[error] handleQueue: ", e)
            })
        }
    }

    async forwardMsg(gid, uid, e, toGroup) {
        const reflect: SessionMap<number> = this.sessionMap
        const client = this.client
        const session = reflect[gid]
        const quote = this.getQuoteMsg(session ? session.msgPool : [], e.source, toGroup)
        e.message = e.message.filter(v => v.type !== "at")
        if (quote && quote.reply) {
            return quote.reply(e.message, true)
        }
        return toGroup ? client.sendGroupMsg(gid, e.message, quote) : client.sendPrivateMsg(uid, e.message, quote)
    }

    updateSession(gid, uid, source = null, forwardRes = null, toGroup = true) {
        const reflect: SessionMap<number> = this.sessionMap
        if (!reflect[gid]) {
            reflect[gid] = {
                qq: uid,
                msgPool: []
            }
        }
        const endTimeNew = new Date().getTime() + (toGroup ? this.config.sessionLife : this.config.sessionLife / 5)
        if (!reflect[gid].endTime || reflect[gid].endTime < endTimeNew) reflect[gid].endTime = endTimeNew
        if (source && forwardRes) {
            if (toGroup) {
                //[private, group]
                reflect[gid].msgPool.push([source, forwardRes])
            } else {
                reflect[gid].msgPool.push([forwardRes, source])
            }
        }
        return this.updateMap()
    }

    /** 转发消息
     * 1. 锁定群会话，群-会话映射中加入该会话 会话生命周期延长5分钟（默认）
     * 2. 将该群头像变为用户头像
     * 2. 将该群名称变为用户名
     * 3. 消息送入该群
     * @param e 消息对象
     * @param groupId 群号
     */
    postToGroup(e, groupId) {
        const client = this.client
        const reflect: SessionMap<number> = this.sessionMap
        const uid = e.sender.user_id
        const avatarUrl = client.pickUser(uid).getAvatarUrl(40)
        const operations = [client.setGroupName(groupId, e.sender.nickname)
            .catch(e => console.log("[error] ", this.name, " setGroupName:", e)),
            client.setGroupPortrait(groupId, avatarUrl)
                .catch(e => console.log("[error] ", this.name, " setGroupPortrait:", e)),
            this.forwardMsg(groupId, uid, e, true)
                .catch(e => console.log("[error] ", this.name, " postToGroup:", e))
                .then(r => this.updateSession(groupId, uid, e, r, true))]
        const all = new Promise((resolve, reject) => {
            if (!reflect[groupId]) {
                return client.sendGroupMsg(groupId, `来自 ${e.sender.nickname} ${e.sender.user_id} 的消息`)
                    .then(r => resolve(r))
                    .catch(e => reject(e))
            } else {
                resolve(0)
            }
        })

        return all.then(() => Promise.all(operations)
            .catch(e => {
                console.error("[error] forwardMsg: ", e)
            }))
    }

    /** 收到私聊消息响应
     * 1. 寻找可用群（空闲，会话过期，当前正在使用的群）
     * 2. 是否是消息队列中的处理流程，若是，则有可用群就发；
     * 若不是，则判断是否已在队列中，若已在队列中，则将消息送去排队；
     * 3. 可用群则消息转发至该群 forwardMsg
     * 4. 用户进入等待回复队列
     * 5. 若无可用群，则将消息推入等待队列
     * @param e 消息对象
     * @param isInQueue 是否在消息队列
     * @see postToGroup
     */
    async onPrivateMsg(e, isInQueue = false) {
        await super.onPrivateMsg(e, isInQueue)
        const uid = e.sender.user_id
        const availableGroup = this.findAvailableGroup(uid)
        const msgQueue = this.msgQueue
        const userInQueue = msgQueue.find(v => v.sender.user_id === uid)
        const flag = isInQueue ? true : !userInQueue
        if (availableGroup && flag) {
            return this.postToGroup(e, availableGroup)
                .catch(e => console.log("[error] ", this.name, " onPrivateMsg: ", e))
                .then(() => {
                    // if (this.replyQueue.indexOf(uid) === -1) {
                    //     this.replyQueue.push(uid)
                    // }
                    return true
                })
        } else {
            const l = msgQueue.length
            if (!msgQueue.find(v => v.message_id === e.message_id)) {
                if (userInQueue) {
                    const userQueue = msgQueue.filter(v => v.sender.user_id === uid)
                    const lastMsg = userQueue[userQueue.length - 1]
                    const i = msgQueue.findIndex(v => v.message_id === lastMsg.message_id)
                    msgQueue.splice(i + 1, 0, e)
                } else {
                    msgQueue.push(e)
                }
            }
            if (!l) {
                this.handleQueue()
            }
        }
        return null
    }

    async onGroupMsg(e) {
        const gid = e.group.group_id
        const reflect: SessionMap<number> = this.sessionMap
        const uid = reflect[gid]?.qq
        if (uid) {
            return this.forwardMsg(gid, uid, e, false)
                .catch(e => console.log("[error] " + this.name + " onGroupMsg:", e))
                .then(r => this.updateSession(gid, uid, e, r, false))
        }
        return null
    }
}
