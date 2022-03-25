import Bot from './oicqBot'
import {QQBotConfig} from "./types";

export * from './plugins'

export function createBot(config: QQBotConfig) {
    return new Bot(config)
}
