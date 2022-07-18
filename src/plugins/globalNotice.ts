import {BasePlugin, DutyMember} from "../types";
import {promiseInSeq} from "../utils";

export class GlobalNotice extends BasePlugin {
    name = "GlobalNotice"
    members: DutyMember[]
    msg: string

    constructor({members, managers}) {
        super();
        this.members = members
        this.managers = managers
    }

    orderKeys = ["群发"]

    orders = [
        (e) => {
            const raw = e.raw_message
            if (this.matchOrder(raw, this.orderKeys) && this.isManager(e) && !e.group) {
                const [global] = raw.split(/[\n\s]+/).filter(v => v !== "")
                const msg = raw.replace(global, "")
                return promiseInSeq(this.members.map(v => () => this.client.sendTempMsg(593070461, v.uid, msg)))
            }
        }
    ]
}
