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

- 创建插件
```javascript

```

目前已搭载插件：
1. 值班提醒bot
2. 消息转发bot
3. 点赞bot
4. 好看图片bot
