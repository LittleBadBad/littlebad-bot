export function parseTime(time, pattern) {
    if (arguments.length === 0 || !time) {
        return null
    }
    const format = pattern || '{y}-{m}-{d} {h}:{i}:{s}'
    let date
    if (typeof time === 'object') {
        date = time
    } else {
        if ((typeof time === 'string') && (/^[0-9]+$/.test(time))) {
            time = parseInt(time)
        } else if (typeof time === 'string') {
            time = time.replace(new RegExp(/-/gm), '/').replace('T', ' ').replace(new RegExp(/\.[\d]{3}/gm), '');
        }
        if ((typeof time === 'number') && (time.toString().length === 10)) {
            time = time * 1000
        }
        date = new Date(time)
    }
    const formatObj = {
        y: date.getFullYear(),
        m: date.getMonth() + 1,
        d: date.getDate(),
        h: date.getHours(),
        i: date.getMinutes(),
        s: date.getSeconds(),
        a: date.getDay()
    }
    return format.replace(/{([ymdhisa])+}/g, (result, key) => {
        let value = formatObj[key]
        // Note: getDay() returns 0 on Sunday
        if (key === 'a') {
            return ['日', '一', '二', '三', '四', '五', '六'][value]
        }
        if (result.length > 0 && value < 10) {
            value = '0' + value
        }
        return value || 0
    })
}

export function getNowFormatDate() {
    return parseTime(new Date(), '{y}年{m}月{d}日')
}


export function getNowFormatDateTime() {
    return parseTime(new Date(), '{y}-{m}-{d} {h}:{i}:{s}')
}

export function onTimeDo(callBack: () => void, frequency: { m: number } = {m: 30}) {
    let did = false
    setInterval(() => {
        if (!frequency || !frequency.m) {
            frequency.m = 30
        }
        frequency.m = Math.floor(frequency.m)
        frequency.m = frequency.m <= 1 ? 2 : frequency.m
        frequency.m = frequency.m >= 60 ? 59 : frequency.m
        const now = new Date()
        const m = now.getMinutes()
        if (m % frequency.m === 0) {
            if (!did) {
                callBack()
                did = true
            }
        } else {
            did = false
        }
    }, 1000)
}

export function to8OClock(time: number): number {
    time = Math.floor(time)
    const d = new Date(time)
    return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 8, 0, 0, 0).getTime()
}

export function getAllDateBetween(start: number, end: number) {
    if (end < start) {
        return []
    }
    start = to8OClock(Math.floor(start))
    end = to8OClock(Math.floor(end))
    const dates = []
    while (start < end) {
        dates.push(new Date(start).toString())
        start += 24 * 60 * 60 * 1000
    }
    return dates
}

export function numToEmoji(num: number | string) {
    num = String(num)
    return num.replace(/1/g, "1️⃣")
        .replace(/2/g, "2️⃣")
        .replace(/3/g, "3️⃣")
        .replace(/4/g, "4️⃣")
        .replace(/5/g, "5️⃣")
        .replace(/6/g, "6️⃣")
        .replace(/7/g, "7️⃣")
        .replace(/8/g, "8️⃣")
        .replace(/9/g, "9️⃣")
        .replace(/0/g, "0️⃣")
}

export function random_item(items) {
    return items[Math.floor(Math.random() * items.length)];
}

export function getRandomEmoji() {
    return random_item(["🥳", "👏🏻", "⭐", "✌", "✨", "👻", "🥰", "😁", "🥵"])
}

export async function reliableDo(callback: () => any, retry = 5) {
    let tryNum = 0, err;
    while (tryNum < retry) {
        try {
            return await callback()
        } catch (e) {
            console.error(e);
            err = e
            tryNum++
        }
    }
    throw new Error(err)
}

const allColor = []

export function hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
    } : null;
}

export function getRandomColor() {
    const c = "ff" + random_item(allColor).replace("#", "")
    return parseInt(c, 16)
}

export function IsJsonString(str) {
    try {
        const json = JSON.parse(str);
        return (typeof json === 'object' && !Array.isArray(json));
    } catch (e) {
        return false;
    }
}

export function promiseDelay(fn: () => Promise<any>, time = 1000) {
    return fn().finally(() => new Promise<void>(resolve => setTimeout(() => resolve(), time)))
}

export async function promiseInSeq(arr: (() => Promise<any>)[]) {
    const res = []
    for (let fn of arr) {
        try {
            const data = await promiseDelay(fn);
            res.push(data)
        } catch (e) {
            res.push(e)
            console.log(e)
        }
    }
    return res;
}
