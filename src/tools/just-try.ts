export function justTry<T, DV>(callback: () => T, defaultValue: DV): (T | DV) {
    try {
        return callback()
    }
    catch {
        return defaultValue
    }
}