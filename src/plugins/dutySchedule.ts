import {BasePlugin, DutyMember} from "../types";
import {PrivateMessageEvent} from "oicq/lib/events";
import {multiMunkres} from "multi-munkres";
import {IsJsonString, promiseInSeq} from "../utils";
import {Client, segment} from "oicq";
import * as fs from "fs";
import * as path from "path";

interface ScheduleConfig {
    members: DutyMember[],
    managers: number[],
    expireLength?: number
}

const setChart = ({
                      template,
                      days,
                      intervals
                  }) => encodeURI(`https://hicug.cn/paiban/#/setChart?${template ? `&template=${template.join(",")}` : ''}${days ? `&days=${days.join(",")}` : ''}${intervals ? `&intervals=${intervals.join(",")}` : ''}`)
const addVacant = (template, {
    name,
    vacant,
    maxDuty
}: {
    name,
    vacant?,
    maxDuty?
}) => encodeURI(`https://hicug.cn/paiban/#/vacant?days=${template.days.join(",")}&intervals=${template.intervals.join(",")}&name=${name}${vacant ? `&vacant=${vacant}` : ''}&maxDuty=${maxDuty ? maxDuty : '3'}`)
const result = (template, res) => encodeURI(`https://hicug.cn/paiban/#/result?days=${template.days.join(",")}&intervals=${template.intervals.join(",")}&result=${JSON.stringify(res)}`)

const defaultExpire = 2 * 24 * 60 * 60 * 1000
const isExpire = (time = 0) => new Date().getTime() > time
const ERR = "https://i0.hdslb.com/bfs/article/30590e334d5303e0042ddc7abd072458417fed17.jpg@825w_819h_progressive.webp"
const INFO = "https://upload-bbs.mihoyo.com/upload/2021/04/24/274588138/f63e055261716f79c997cc562f5b25c4_1842754088739819212.jpg?x-oss-process=image//resize,s_600/quality,q_80/auto-orient,0/interlace,1/format,jpg"
const SUCCESS = "https://n.sinaimg.cn/sinakd20220415ac/700/w790h710/20220415/7860-f4f3a65866f6fbd2745217babb035c2b.jpg"

/**
 * 1. 文件存储数据
 * 2. 排班模板、空闲表可直接提交json
 * 3. 每提交一次空闲表有效期为2天
 * 4. 可记录上一次的提交结果
 * 5. 新增一些图片
 * 6. 新增动态添加值班成员的指令
 */
export class DutySchedule extends BasePlugin {

    name = "DutySchedule"

    create = ["创建值班"]
    publish = ["发布"]
    status = ["值班成员"]
    schedule = ["排班"]
    vacant = ["空闲表"]
    orderKeys = [...this.create, ...this.publish, ...this.status, ...this.schedule, ...this.vacant]

    config: ScheduleConfig = {members: [], managers: [], expireLength: defaultExpire}
    expireLength = defaultExpire

    private _members: {
        name,
        maxDuty?,
        vacant?,
        uid,
        submit?
    }[] = []
    get members(): { name; maxDuty?; vacant?; uid; submit? }[] {
        return this._members;
    }

    set members(value: { name; maxDuty?; vacant?; uid; submit? }[]) {
        this._members = value;
    }

    private _chartTemplate = {
        days: ["周一", "周二", "周三", "周四", "周五", "周六", "周日"],
        intervals: ["8:00-10:00", "10:00-12:30", "14:00-16:00", "16:00-18:00", "19:00-21:30", "21:30-23:30"],
        template: new Array(42).fill(1)
    }
    get chartTemplate(): { template: any[]; intervals: string[]; days: string[] } {
        return this._chartTemplate;
    }

    set chartTemplate(value: { template: any[]; intervals: string[]; days: string[] }) {
        this._chartTemplate = value;
    }


    dutyData = ""

    constructor(config: ScheduleConfig) {
        super();
        this.config = config
        this.members = this.config.members.map(v => ({...v}))
        this.managers.push(...this.config.managers)
        this.expireLength = config.expireLength || defaultExpire
    }

    private initData(path) {
        return fs.promises.readFile(path)
            .then(data => JSON.parse(data.toString()))
            .then(d => {
                for (let i = 0; i < this.members.length; i++) {
                    const j = d.members.findIndex(v => v.name === this.members[i].name)
                    if (j > -1) {
                        this.members[i] = d.members[j]
                        d.members.splice(j, 1)
                    }
                }
                this.members.push(...d.members)
                this.chartTemplate = d.chartTemplate
            })
            .catch(e => {

            })
    }

    updateData() {
        const {members, chartTemplate} = this
        return fs.promises
            .writeFile(this.dutyData, JSON.stringify({members, chartTemplate}))
            .catch(err => console.log("[error] updateData ", err))
    }

    onInstall(client: Client, managers, dataPath) {
        super.onInstall(client, managers, dataPath);
        return fs.promises.mkdir(this.dataPath, {recursive: true})
            .then(r => path.join(this.dataPath, "duty.json"))
            .then(r => (this.dutyData = r) && this.initData(r))
    }

    isOrder(e: any): any {
        const raw = e.raw_message
        const j = IsJsonString(raw) ? JSON.parse(raw) : undefined;
        return (super.isOrder(e) || j?.template || j?.vacant) && !e.group;
    }

    orders = [
        /**
         * 创建排班模板
         * @param e
         */
        (e: PrivateMessageEvent) => {
            const raw = e.raw_message
            const j = IsJsonString(raw) ? JSON.parse(raw) : undefined;
            if ((this.matchOrder(raw, this.create) || j?.template) && this.isManager(e)) {
                const [create] = raw.split(/[\n\s]+/).filter(v => v !== "")
                const string = raw.replace(create, "")
                try {
                    const chartTemplate = j || JSON.parse(string)
                    if (!(chartTemplate.days && chartTemplate.intervals && chartTemplate.template)) {
                        throw Error("")
                    }
                    this.chartTemplate = chartTemplate
                    this.updateData()
                    return e.reply(segment.share(
                        setChart(chartTemplate),
                        "提交结果",
                        SUCCESS,
                        '好耶！成功了'
                    ))
                } catch (err) {
                    return e.reply(segment.share(
                        setChart(this.chartTemplate),
                        "创建值班",
                        INFO,
                        "打开创建并复制内容"
                    ))
                }

            }
        },

        /**
         * 发布排班
         * @param e
         */
        (e: PrivateMessageEvent) => {
            if (this.triggerKey(e.raw_message, this.publish) && this.managers.find(v => e.sender.user_id === v)) {
                const [publish] = e.raw_message.split(/[\n\s]+/).filter(v => v !== "")
                const content = e.raw_message.replace(publish, "")
                return promiseInSeq(this.members.filter(v => isExpire(v.submit)).map(v => async () => await this.client.sendTempMsg(593070461,
                    v.uid, segment.share(
                        addVacant(this.chartTemplate, v),
                        "填写空闲表",
                        INFO,
                        `发送 空闲表 空格 内容 或 直接粘贴内容 即可录入空闲时间`
                    )).then(_ => content !== "" ? this.client.sendTempMsg(593070461, v.uid, content) : undefined)))
            }
        },
        /**
         * 查看空闲表提交状态
         * @param e
         */
        (e: PrivateMessageEvent) => {
            const raw = e.raw_message
            if (this.matchOrder(e.raw_message, this.status) && this.managers.find(v => e.sender.user_id === v)) {
                const [dutyMember, name, uid] = raw.split(/[\n\s]+/).filter(v => v !== "")
                if (name && uid) {
                    this.members.push({name, uid: parseInt(uid)})
                    this.updateData()
                    return e.reply(`添加成员成功，${name}， ${uid}`)
                }
                const submit = this.members.filter(v => !isExpire(v.submit))
                const unSubmit = this.members.filter(v => isExpire(v.submit))
                return e.reply(`已提交：${submit.map(v => v.name)}\n共${submit.length}人\n未提交：${unSubmit.map(v => v.name)}\n共${unSubmit.length}人`)
            }
        },

        /**
         * 提交空闲表
         * @param e
         */
        (e: PrivateMessageEvent) => {
            const raw = e.raw_message
            const j = IsJsonString(raw) ? JSON.parse(raw) : undefined;
            const u = this.members.find(v => v.uid === e.sender.user_id)
            if ((this.matchOrder(raw, this.vacant) || j?.vacant) && u) {
                const [vacant] = raw.split(/[\n\s]+/).filter(v => v !== "")
                const value = raw.replace(vacant, "")
                try {
                    const member = j || JSON.parse(value)
                    if (!(member.name && typeof member.maxDuty !== 'undefined' && member.vacant)) {
                        throw Error("")
                    }
                    const u1 = this.members.find(v => v.name === member.name)
                    if (!u1) return e.reply(segment.share(
                        addVacant(this.chartTemplate, u),
                        "没有此成员",
                        ERR,
                        "重新提交"
                    ))
                    u1.maxDuty = member.maxDuty
                    u1.vacant = member.vacant
                    u1.submit = new Date().getTime() + this.expireLength
                    this.updateData()
                    return e.reply(segment.share(
                        addVacant(this.chartTemplate, u1),
                        "提交成功",
                        SUCCESS,
                        "点击查看"
                    ))
                } catch (err) {
                    return e.reply(segment.share(
                        addVacant(this.chartTemplate, u),
                        "提交空闲表",
                        INFO,
                        `点击创建并复制内容，发送 ${vacant} 内容 即可录入空闲时间`
                    ))
                }
            }
        },

        /**
         * 排班
         * @param e
         */
        (e: PrivateMessageEvent) => {
            if (this.triggerKey(e.raw_message, this.schedule)) {
                const submit = this.members.filter(v => !isExpire(v.submit))
                const res = multiMunkres(this.chartTemplate.template,
                    submit.map(v => v.vacant),
                    submit.map(v => v.maxDuty), 2)
                    .map(v => v.map(v1 => submit[v1].name))
                return e.reply(segment.share(
                    result(this.chartTemplate, res),
                    "排班结果",
                    SUCCESS,
                    "若结果不满意可再次发送该指令"
                ))

            }
        }
    ]
}
