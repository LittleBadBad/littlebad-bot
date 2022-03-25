import {BasePlugin, QQBotConfig} from "./types";
import {Client, createClient} from "oicq";
import * as path from "path";

export default class oicqBot {
    config: QQBotConfig
    client: Client
    plugins: Array<BasePlugin>

    constructor(config: QQBotConfig) {
        this.client = createClient(config.qq)
        this.plugins = []
        this.config = config
    }

    use(plugin: BasePlugin) {
        plugin.onInstall(this.client,
            this.config.managers,
            path.join(this.config.dataPath, plugin.name))
        this.plugins.push(plugin)
    }

    start() {
        const client = this.client
        this.plugins.forEach(v => {
            v.onStart()
        })
        client.on("system.online", () => {
            console.log("Logged in!")
        })

        client.on("message", (e: any) => {
            const orderPlugin = this.plugins.find(v => v.isOrder(e))
            orderPlugin ? orderPlugin.onOrder(e)
                    .catch(err => console.log("[error] oicqBot onOrder ", err)) :
                Promise.all(this.plugins.map(v => v.onMessage(e)))
                    .catch(err => console.log("[error] oicqBot onMessage ", err))
        })

        client.on("guild.message", e => {
            Promise.all(this.plugins.map(v => v.onGuildMessage(e)))
                .catch(err => console.log("[error] oicqBot onMessage ", err))
        })

        client.on("system.login.qrcode", function (e) {
            //扫码后按回车登录
            process.stdin.once("data", () => {
                this.login()
            })
        }).login()
    }
}
