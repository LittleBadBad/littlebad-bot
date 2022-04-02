# 阿坏机器人

基于 [oicq](https://github.com/takayama-lily/oicq) 开发的机器人平台，提供一些方便的接口简化插件开发

## 安装

```
npm install littlebad-bot
or
yarn add littlebad-bot
```

## 示例代码

- 创建机器人

```javascript
const bot = createBot({
    qq: 1287299719,
    managers: [548481661],
    dataPath: "botData/" + 1287299719
})
bot.start()
```

- 创建插件并使用

```javascript
class Setu extends BasePlugin {
    orderKeys = ["setu"]

    onOrder(e) {
        e.reply("不准色色")
    }
}

const bot = createBot({
    qq: 1287299719,
    managers: [548481661],
    dataPath: "botData/" + 1287299719
})
bot.use(new Setu())
bot.start()
```

## 指令细分

```javascript
class Setu extends BasePlugin {

    setu = ["setu"]
    noSetu = ["noSetu"]
    orderKeys = [...this.setu, ...this.noSetu]
    orders = [
        this.onSetu.bind(this),
        this.onNoSetu.bind(this)
    ]

    onSetu(e) {
        // 在此判断指令触发语句条件或其他条件
        if (this.triggerKey(e.raw_message, this.setu)) {
            return e.reply("不准色色")
        }
    }

    onNoSetu(e) {
        if (this.triggerKey(e.raw_message, this.noSetu)) {
            return e.reply("好")
        }
    }
}
```

## 目前已搭载插件

1. 值班提醒bot
2. 消息转发bot
3. 点赞bot
4. 好看图片bot

## 计划列表

|开发计划|状态|
| ---- | ---- |
|好图新图源|⛏|
|收集值班空闲时间插件|📅|
|频道机器人整合|⛏|

## 欢迎提issue&pr
