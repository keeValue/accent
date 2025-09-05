export async function withMinDuration<T>(promise: Promise<T>, ms: number): Promise<T> {
    const start = Date.now()
    const result = await promise
    const elapsed = Date.now() - start
    if (elapsed < ms) await new Promise(r => setTimeout(r, ms - elapsed))
    return result
}