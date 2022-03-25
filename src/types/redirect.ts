import {GroupMessageEvent, PrivateMessageEvent} from "oicq";

export interface Redirect {
    qq: number
    endTime: number
    clientMsg: Array<Array<PrivateMessageEvent | GroupMessageEvent | any>>
    ahuaiMsg: Array<Array<PrivateMessageEvent | GroupMessageEvent | any>>
}

export interface Reflect<T> {
    T: Redirect | null
}
