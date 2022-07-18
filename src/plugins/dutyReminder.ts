import {BasePlugin, DutyConfig} from "../types";
import {Client, PrivateMessageEvent} from "oicq";
import {parseTime} from "../utils";
import * as schedule from 'node-schedule'
import * as fs from "fs";
import * as path from "path";

type Schedule = {
    dutyList?: string[]
    timeList?: string[]
}

export class DutyReminder extends BasePlugin {
    name = "DutyReminder"
    config: DutyConfig
    newSchedule: Schedule = {}
    inSchedule: Schedule = {
        dutyList: ["阳仔", "阿宅", "阳仔", "炸鸡", "桐桐", "桐桐", "桃桃", "棋子", "木木", "棋子", "柴柴", "保安", "小杨", "小李", "十七", "桃桃", "流念", "小李", "十七", "流念", "小李", "柴柴", "电池", "盆友", "苏墨", "炸鸡", "阳仔", "木木", "阿宅", "黄凯"],
        timeList: ["08:00", "10:00", "14:00", "16:00", "19:00", "21:00"]
    }
    n = 0
    day = 0
    dutyData: string

    /**
     * 1. 设置今日已完成数："设置n", "完成班数" + 空格 + 数字
     * 2. 设置第d天： "设置d", "完成天数" + 空格 + 数字
     * 3. 临时添加成员："添加", "添加成员" + 名字 + qq
     * 4. 应用最新值班数据："应用最新"
     * 5. 查看当前值班状态："查看状态", "状态"
     */
    setN = ["设置n", "完成班数"]
    setD = ["设置d", "完成天数"]
    addMem = ["添加", "添加成员"]
    update = ["应用最新"]
    cancel = ["取消最新"]
    checkSt = ["查看状态", "状态"]
    orderKeys = [...this.setN, ...this.setD, ...this.addMem, ...this.update, ...this.cancel, ...this.checkSt]

    orders = [
        this.infoOrder.bind(this),
        this.addTimeList.bind(this),
        this.addDuty.bind(this)
    ]

    private initData(path) {
        return fs.promises.readFile(path)
            .then(data => JSON.parse(data.toString()))
            .then(d => {
                this.newSchedule = d.newSchedule
                this.inSchedule = {...this.inSchedule, ...d.inSchedule}
                this.day = d.day
                this.n = d.n
            })
            .catch(e => {
                this.newSchedule = {}
                this.inSchedule = {...this.inSchedule}
                this.day = 0
                this.n = 0
            })
    }

    updateData() {
        const {newSchedule, inSchedule, day, n} = this
        return fs.promises
            .writeFile(this.dutyData, JSON.stringify({newSchedule, inSchedule, day, n}))
            .catch(err => console.log("[error] updateData ", err))
    }

    onInstall(client: Client, managers, dataPath) {
        super.onInstall(client, managers, dataPath);
        return fs.promises.mkdir(this.dataPath, {recursive: true})
            .then(r => path.join(this.dataPath, "duty.json"))
            .then(r => (this.dutyData = r) && this.initData(r))
    }

    isOrder(e) {
        const rawMsg = e.raw_message
        const rawData = rawMsg.replace(/"/g, "").split(/[\n\s,，]+/g).filter(v => v !== "")
        return (this.triggerKey(rawData[0], this.orderKeys) ||
                rawData.find(v => this.config.members.find(v1 => v1.name === v) || /^([0-1]?[0-9]|2[0-3])[:：][0-5][0-9]$/g.test(v))) &&
            this.managers.indexOf(e.sender.user_id) > -1
    }

    constructor(config: DutyConfig) {
        super();
        this.config = config
        this.managers.push(...this.config.managers)
    }

    processList(dutyList) {
        if (dutyList && dutyList.length) {
            const timeList = this.newSchedule.timeList || this.inSchedule.timeList
            const newList = []
            const days = Math.ceil(dutyList.length / timeList.length)
            for (let i = 0; i < days; i++) {
                for (let j = 0; j < timeList.length; j++) {
                    const index = j * days + i
                    if (index < dutyList.length) {
                        newList.push(dutyList[index])
                    }
                }
            }
            return newList
        }
        return []
    }

    getUid(name: string): number {
        return this.config.members.find(v => v.name === name)?.uid
    }

    callForDuty(name: string) {
        const uid = this.getUid(name)
        if (uid) {
            this.client.sendTempMsg(593070461, uid, `${name}，宝，值班啦`)
                .then(r => this.client.pickFriend(uid)?.poke()).catch(e => {
                console.log("[error] DutyReminder callForDuty ", e)
            })
        } else {
            if (name !== "没人") {
                this.client.sendPrivateMsg(this.config.managers[0], `未找到 ${name} 的qq号，发送指令：添加 昵称 qq号 既可以录入新的值班成员`).catch(e => {
                    console.log("[error] DutyReminder callForDuty ", e)
                })
            }
        }
    }

    useNew() {
        if (this.newSchedule.dutyList || this.newSchedule.timeList) {
            this.inSchedule = {...this.inSchedule, ...this.newSchedule}
            this.newSchedule = {}
            this.day = 0
            this.n = 0
        }
    }

    refreshBackend() {
        this.n = 0
        this.day++
        this.useNew()
        this.updateData()
    }

    startDuty() {
        const time = parseTime(new Date(), '{h}:')
        const i = this.inSchedule?.timeList?.findIndex(v => new RegExp(time).test(v))
        if (i === this.n) {
            const index = this.n + this.day * this.inSchedule.timeList.length
            this.n++
            if (this.inSchedule?.dutyList && this.inSchedule.dutyList.length > index) {
                this.callForDuty(this.inSchedule.dutyList[index])
            }
            this.updateData()
        }
    }

    onStart() {
        super.onStart();
        this.inSchedule.dutyList = this.processList(this.inSchedule.dutyList)
        schedule.scheduleJob('0 0 0 * * *', this.refreshBackend.bind(this))
        this.startDuty()
        setInterval(this.startDuty.bind(this), 60 * 1000)
    }

    getStatus(using = false) {
        return (using ? `\n${this.inSchedule.dutyList
                .filter((v, i) => i >= (this.day * this.inSchedule.timeList.length))
                .map((v, i) => i < this.n ? "完成" : v)}\n${this.inSchedule.timeList}` :
            `\n${this.newSchedule.dutyList}\n${this.newSchedule.timeList}`)
    }

    infoOrder(e: PrivateMessageEvent, rawData) {
        if (this.triggerKey(rawData[0], this.orderKeys)) {
            if (this.triggerKey(rawData[0], this.addMem)) {
                const [add, user, uid] = rawData
                const u = this.config.members.find(v => v.name === user)
                if (u) {
                    u.uid = parseInt(uid)
                } else {
                    this.config.members.push({name: user, uid: parseInt(uid)})
                }
            } else if (this.triggerKey(rawData[0], this.update)) {
                this.useNew()
            } else if (this.triggerKey(rawData[0], this.cancel)) {
                this.newSchedule = {}
            } else if (this.triggerKey(rawData[0], this.setN)) {
                const [set, n] = rawData
                this.n = parseInt(n)
            } else if (this.triggerKey(rawData[0], this.setD)) {
                const [set, d] = rawData
                this.day = parseInt(d)
            }
            this.updateData()
        }
    }

    addTimeList(e: PrivateMessageEvent, rawData) {
        if (rawData.every(v => /^([0-1]?[0-9]|2[0-3])[:：][0-5][0-9]$/g.test(v))) {
            rawData = rawData.map(v => {
                const [h, m] = v.split(/[:：]/g)
                return `${(h.length < 2 ? "0" + h : h)}:${(m.length < 2 ? "0" + m : m)}`
            })
            this.newSchedule.timeList = rawData.sort()
        }
    }

    addDuty(e: PrivateMessageEvent, rawData) {
        if (rawData.length > 1 && rawData.every(v => this.config.members.find(v1 => v1.name === v))) {
            this.newSchedule.dutyList = this.processList(rawData)
        }
    }

    async onOrder(e: PrivateMessageEvent): Promise<any> {
        const rawMsg = e.raw_message
        let rawData = rawMsg.replace(/"/g, "").split(/[\n\s,，]+/g).filter(v => v !== "")
        this.orders.find(v => v(e, rawData))
        return this.updateData().then(r => e.reply(`最新${this.getStatus(false)}\n进行中${this.getStatus(true)}\n已完成:${this.n}班\n已完成:${this.day}天`)
            .catch(e => {
                console.log("[error] DutyReminder onPrivateMsg ", e)
            }))

    }

}
