
const urls = {
    checkDates: `/get_date_bounds`,
    searchScenes: `/search_scenes`,
    downloadScene: `/download_scene`
}

const wrapUrl = (url: string) => {
    return `http://127.0.0.1:5000${url}`
}

export const getUrl = (key: keyof typeof urls, ...args: any): string => {
    const url = urls[key] as any
    if (typeof url === 'function') {
        return wrapUrl(url(...args))
    }
    else return wrapUrl(url)
}