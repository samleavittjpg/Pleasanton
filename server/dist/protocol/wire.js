export function encodeServerMessage(msg) {
    return JSON.stringify(msg);
}
export function safeJsonParse(raw) {
    try {
        return JSON.parse(raw);
    }
    catch {
        return undefined;
    }
}
//# sourceMappingURL=wire.js.map