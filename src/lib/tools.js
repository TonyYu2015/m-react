export function turn2(val, totalLen = 32) {
    let numStr = Number(val).toString(2);
    return `0b${Array(totalLen - numStr.length).fill(0).join('')}${numStr}`;
}