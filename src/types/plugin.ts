import {DiscussMessageEvent, GroupMessageEvent, PrivateMessageEvent} from "oicq/lib/events";
import {GuildMessageEvent} from "oicq/lib/internal/guild";
import {Client} from "oicq";

interface Plugin {
    onStart()

    onMessage(e: PrivateMessageEvent | GroupMessageEvent | DiscussMessageEvent | any)

    onGuildMessage(e: GuildMessageEvent | any)
}

export class BasePlugin implements Plugin {
    client: Client
    managers: number[]
    name: string = "BasePlugin"
    dataPath: string = this.name

    /**
     * 本插件所包含的全部命令关键词
     */
    orderKeys = []

    /**
     * 本插件各类命令的函数列表，调用方法详见onOrder
     * @see onOrder
     */
    orders: ((e, ...others) => any)[] = []

    /**
     * 判断是否触发本插件命令关键词
     * @param e
     */
    isOrder(e: PrivateMessageEvent | GroupMessageEvent | any) {
        return this.orderKeys.find(v => e.raw_message.toLowerCase().indexOf(v) > -1)
    }

    /**
     * 检测是否触发某条命令快捷函数
     * @param raw 消息的文字内容
     * @param keyList 命令列表
     */
    triggerKey(raw: string, keyList: string[]) {
        return keyList.find(v => raw.toLowerCase().indexOf(v) > -1)
    }

    /**
     * 插件安装时响应
     * @param client
     * @param managers
     * @param dataPath
     */
    onInstall(client: Client, managers, dataPath) {
        this.client = client
        this.managers = managers
        this.dataPath = dataPath
    }

    /**
     * 接收到的消息触发命令时响应，可以在此处理全部命令，也可以在orders里分别定义
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
