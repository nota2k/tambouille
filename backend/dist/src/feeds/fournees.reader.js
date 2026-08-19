"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FourneeParseError = void 0;
exports.parseFournee = parseFournee;
exports.fourneesDir = fourneesDir;
exports.readFournees = readFournees;
const fs_1 = require("fs");
const path_1 = require("path");
class FourneeParseError extends Error {
    constructor(path, detail) {
        super(`${path} : ${detail}`);
        this.name = 'FourneeParseError';
    }
}
exports.FourneeParseError = FourneeParseError;
const FRONTMATTER = /^---[ \t]*\r?\n([\s\S]*?)\r?\n---[ \t]*(?:\r?\n([\s\S]*))?$/;
function unquote(value) {
    const quoted = (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"));
    return quoted && value.length >= 2 ? value.slice(1, -1) : value;
}
function parseInlineList(value) {
    if (!value.startsWith('[') || !value.endsWith(']'))
        return null;
    const inner = value.slice(1, -1).trim();
    if (!inner)
        return [];
    return inner
        .split(',')
        .map((item) => unquote(item.trim()))
        .filter((item) => item.length > 0);
}
function parseFournee(raw, path) {
    const found = FRONTMATTER.exec(raw.trim());
    if (!found) {
        throw new FourneeParseError(path, 'aucun frontmatter délimité par `---`');
    }
    const entries = new Map();
    for (const line of (found[1] ?? '').split(/\r?\n/)) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#'))
            continue;
        const separator = trimmed.indexOf(':');
        if (separator === -1)
            continue;
        entries.set(trimmed.slice(0, separator).trim(), unquote(trimmed.slice(separator + 1).trim()));
    }
    const require = (key) => {
        const value = entries.get(key);
        if (value === undefined || value === '') {
            throw new FourneeParseError(path, `la clé \`${key}\` est absente`);
        }
        return value;
    };
    const rawNumber = require('number');
    const number = Number(rawNumber);
    if (!Number.isInteger(number) || number <= 0) {
        throw new FourneeParseError(path, `\`number\` vaut « ${rawNumber} », attendu un entier positif`);
    }
    const mixIds = parseInlineList(require('mixes'));
    if (mixIds === null) {
        throw new FourneeParseError(path, '`mixes` n’est pas une liste en ligne');
    }
    return {
        number,
        title: require('title'),
        period: require('period'),
        intro: (found[2] ?? '').trim(),
        mixIds: [...new Set(mixIds)],
    };
}
function fourneesDir() {
    return (process.env.FOURNEES_DIR ??
        (0, path_1.resolve)(process.cwd(), '..', 'frontend', 'src', 'content', 'fournees'));
}
function readFournees(dir = fourneesDir()) {
    let names;
    try {
        names = (0, fs_1.readdirSync)(dir);
    }
    catch {
        return [];
    }
    return names
        .filter((name) => name.endsWith('.md') && name !== 'README.md')
        .sort()
        .map((name) => parseFournee((0, fs_1.readFileSync)((0, path_1.join)(dir, name), 'utf8'), name));
}
//# sourceMappingURL=fournees.reader.js.map