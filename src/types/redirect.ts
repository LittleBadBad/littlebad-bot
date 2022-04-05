import {GroupMessageEvent, PrivateMessageEvent} from "oicq";

export interface Redirect {
    qq: number
    endTime: number
    msgPool: (PrivateMessageEvent | GroupMessageEvent | any)[][]
}

export interface SessionMap<T> {
    T: Redirect | null
}
