import {BasePlugin, QQBotConfig} from "./types";
import {Client, createClient} from "oicq";
import * as nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
    host: 'smtp.qq.com',
    secure: true,
    auth: {
        user: 'hicug_prd@qq.com',
        pass: 'xuxexotpnfyidcai'
    }
});
export default class oicqBot {
    get onError(): (e: any) => void {
        return this._onError;
    }

    set onError(value: (e: any) => void) {
        this._onError = value;
    }

    config: QQBotConfig
    client: Client
    plugins: Array<BasePlugin>

    constructor(config: QQBotConfig) {
        this.client = createClient(config.qq, config.others)
        this.plugins = []
        this.config = config
    }

    use(plugin: BasePlugin) {
        plugin.onInstall(this.client,
            this.config.managers,
            this.config.dataPath)
        this.plugins.push(plugin)
    }

    private _onError: (e: any) => void = (e) => {
        transporter.sendMail({
            from: '"机器人 👻" <hicug_prd@qq.com>', // sender address
            to: this.config.managers.map(v => v + "@qq.com").join(","), // list of receivers
            subject: `呜呜呜，出事啦`, // Subject line
            // plain text body
            text: JSON.stringify(e)
        }).catch(e => console.log("sendMail", e));
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

        this.config.password ?
            client.on("system.login.slider", e => {
                //扫码后按回车登录
                console.log(e, "输入ticket：")
                this.onError(e)
                // process.stdin.once("data", ticket => client.submitSlider(String(ticket).trim()))
            }).on("system.login.device", e => {
                console.log("system.login.device", e)
                this.onError(e)
                // process.stdin.once("data", () => {
                //     this.login()
                // })
            }).login(this.config.password) :
            client.on("system.login.qrcode", e => {
                //扫码后按回车登录
                console.log(e)
                this.onError(e)
                // process.stdin.once("data", () => {
                //     this.login()
                // })
            }).login()
        client.on("system.offline.kickoff", e => {
            this.onError(e)
        })
    }
}
