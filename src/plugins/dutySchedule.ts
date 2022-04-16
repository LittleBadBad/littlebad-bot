import {BasePlugin, DutyMember} from "../types";
import {PrivateMessageEvent} from "oicq/lib/events";
import {multiMunkres} from "multi-munkres";
import schedule from 'node-schedule'

interface ScheduleConfig {
    members: DutyMember[],
    managers: number[]
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


export class DutySchedule extends BasePlugin {

    create = ["创建值班"]
    publish = ["发布"]
    status = ["值班成员"]
    schedule = ["排班"]
    vacant = ["空闲表"]
    orderKeys = [...this.create, ...this.publish, ...this.status, ...this.schedule, ...this.vacant]

    config: ScheduleConfig = {members: [], managers: []}

    members: {
        name,
        maxDuty?,
        vacant?,
        uid,
        submit?
    }[] = []


    chartTemplate = {
        days: ["周一", "周二", "周三", "周四", "周五", "周六", "周日"],
        intervals: ["8:00-10:00", "10:00-12:30", "14:00-16:00", "16:00-18:00", "19:00-21:30", "21:30-23:30"],
        template: new Array(42).fill(1)
    }

    constructor(config: ScheduleConfig) {
        super();
        this.config = config
        this.members = this.config.members.map(v => ({...v}))
        this.managers.push(...this.config.managers)
        schedule.scheduleJob('0 0 0 1/2 * ? ', () => {
            this.members = this.members.map(v => ({...v, submit: false}))
        })
    }

    orders = [
        /**
         * 创建排班模板
         * @param event
         */
        (event: PrivateMessageEvent) => {
            if (this.triggerKey(event.raw_message, this.create) && this.managers.find(v => event.sender.user_id === v)) {
                const [create, string] = event.raw_message.split(/[\n\s]+/).filter(v => v !== "")
                if (string) {
                    try {
                        const chartTemplate = JSON.parse(string)
                        if (!chartTemplate.days || !chartTemplate.intervals || !chartTemplate.template) {
                            throw Error("")
                        }
                        this.chartTemplate = chartTemplate
                        event.reply(`提交结果：${setChart(chartTemplate)}`)
                    } catch (e) {
                        event.reply(`数据格式错误，打开 ${setChart(this.chartTemplate)} 创建并复制内容，发送 ${create} 内容 即可`)
                    }
                } else {
                    event.reply(`打开 ${setChart(this.chartTemplate)} 创建并复制内容，发送 ${create} 内容 即可`)
                }
                return true
            }
        },
        /**
         * 发布排班
         * @param e
         */
        (e: PrivateMessageEvent) => {
            if (this.triggerKey(e.raw_message, this.publish) && this.managers.find(v => e.sender.user_id === v)) {
                return this.members.filter(v=>!v.submit).map(v => this.client.sendPrivateMsg(
                    v.uid, `点击${addVacant(this.chartTemplate, v)}，填写空闲时间并复制，发送 空闲表 内容 即可录入空闲时间`))
            }
        },
        /**
         * 查看空闲表提交状态
         * @param e
         */
        (e: PrivateMessageEvent) => {
            if (this.triggerKey(e.raw_message, this.status) && this.managers.find(v => e.sender.user_id === v)) {
                const submit = this.members.filter(v => v.submit)
                return e.reply(`已提交：${submit.map(v => v.name)}\n共${submit.length}人`)
            }
        },
        /**
         * 提交空闲表
         * @param event
         */
        (event: PrivateMessageEvent) => {
            const u = this.members.find(v => v.uid === event.sender.user_id)
            if (this.triggerKey(event.raw_message, this.vacant) && u) {
                const [vacant, value] = event.raw_message.split(/[\n\s]+/).filter(v => v !== "")
                if (value) {
                    try {
                        const member = JSON.parse(value)
                        if (!member.name || !member.maxDuty || !member.vacant) {
                            throw Error("")
                        }
                        u.maxDuty = member.maxDuty
                        u.name = member.name
                        u.vacant = member.vacant
                        u.submit = true
                        event.reply(`提交结果：${addVacant(this.chartTemplate, u)}`)
                    } catch (e) {
                        event.reply(`数据格式错误，打开 ${addVacant(this.chartTemplate, u)} 创建并复制内容，发送 ${vacant} 内容 即可录入空闲时间`)
                    }
                } else {
                    event.reply(`打开 ${addVacant(this.chartTemplate, u)} 创建并复制内容，发送 ${vacant} 内容 即可录入空闲时间`)
                }
                return true
            }
        },

        /**
         * 排班
         * @param e
         */
        (e: PrivateMessageEvent) => {
            if (this.triggerKey(e.raw_message, this.schedule)) {
                const submit = this.members.filter(v => v.submit)
                const res = multiMunkres(this.chartTemplate.template,
                    submit.map(v => v.vacant),
                    submit.map(v => v.maxDuty)).map(v => v.map(v1 => this.members[v1].name))
                return e.reply(`排班结果：${result(this.chartTemplate, res)}`)
            }
        }
    ]


}