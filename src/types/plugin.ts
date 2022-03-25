import {DiscussMessageEvent, GroupMessageEvent, PrivateMessageEvent} from "oicq/lib/events";
import {GuildMessageEvent} from "oicq/lib/internal/guild";
import {Client} from "oicq";
import path from "path";

interface Plugin {
    onStart()

    onMessage(e: PrivateMessageEvent | GroupMessageEvent | DiscussMessageEvent | any)

    onGuildMessage(e: GuildMessageEvent | any)
}

export class BasePlugin implements Plugin {
    client: Client;

    /**
     * 本插件的管理员列表
     */
    managers: number[] = []

    /**
     * 定义新插件时此项建议定义
     */
    name: string = "BasePlugin"

    /**
     * 本插件的文件路径，默认在安装后，值为${主机器人的文件路径}/${本插件的名字}
     */
    dataPath: string = ""

    /**
     * 本插件所包含的全部命令关键词
     */
    orderKeys: string[] = []

    /**
     * 本插件各类命令的函数列表，调用方法详见onOrder
     * @see onOrder
     */
    orders: ((e, ...others) => any)[] = []

    /**
     * 判断是否触发本插件命令关键词 默认对全部的orderKeys执行triggerKey，可在此重载，附加对指令的来源以及发送人等信息的判断
     * @see orderKeys
     * @see triggerKey
     * @param e
     */
    isOrder(e: PrivateMessageEvent | GroupMessageEvent | any): any {
        return this.triggerKey(e.raw_message, this.orderKeys)
    }

    /**
     * 检测是否触发某条命令快捷函数，默认检测本语句的字符串中是否包含命令子串
     * @param raw 消息的文字内容
     * @param keyList 命令列表
     */
    triggerKey(raw: string, keyList: string[]) {
        return keyList.find(v => raw.toLowerCase().indexOf(v) > -1)
    }

    /**
     * 插件安装时响应，由于插件是先构建后安装，安装后才可获得主机器人内的相关参数，可在此添加插件安装时的响应函数
     * @param client client对象
     * @param managers 机器人管理员
     * @param dataPath 文件路径
     */
    onInstall(client: Client, managers, dataPath) {
        this.client = client
        this.managers = managers
        this.dataPath = path.join(dataPath, this.name)
    }

    /**
     * 接收到的消息触发命令时响应，默认执行orders里的全部函数，
     * 可以在orders里分别定义，也可以重载此函数
     * @see orders
     * @param e
     */
    async onOrder(e: PrivateMessageEvent | GroupMessageEvent | GuildMessageEvent): Promise<any> {
        return this.orders.find(v => v(e))
    }

    /**
     * 接收到命令以外私聊消息时响应
     * @param e 消息事件
     * @param others 其他
     */
    async onPrivateMsg(e: PrivateMessageEvent, ...others): Promise<any> {

    }

    /**
     * 接收到命令以外群聊消息时响应
     * @param e 消息事件
     * @param others 其他
     */
    async onGroupMsg(e: GroupMessageEvent, ...others): Promise<any> {

    }

    /**
     * 接收到命令以外频道消息时响应
     * @param e 消息事件
     */
    async onGuildMessage(e: GuildMessageEvent) {

    }

    /**
     * 接收到命令以外的私聊/群聊消息时的响应
     * @param e 消息事件
     */
    async onMessage(e: PrivateMessageEvent | GroupMessageEvent | DiscussMessageEvent | any) {
        return e.group ? this.onGroupMsg(e).catch(e => {
            console.error("[error] ", this.name, e.group ? 'onGroupMsg' : 'onPrivateMsg', ": ", e)
        }) : this.onPrivateMsg(e).catch(e => {
            console.error("[error] ", this.name, e.group ? 'onGroupMsg' : 'onPrivateMsg', ": ", e)
        })
    }

    /**
     * 主机器人启动时响应
     */
    onStart() {
    }
}
