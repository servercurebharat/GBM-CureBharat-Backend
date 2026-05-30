"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateSession = exports.getSession = void 0;
const sessionCache = new Map();
const SESSION_EXPIRY_MS = 30 * 60 * 1000; // 30 minutes
const getSession = (userId) => {
    const session = sessionCache.get(userId);
    const now = Date.now();
    if (session && (now - session.lastInteraction) < SESSION_EXPIRY_MS) {
        return session;
    }
    // Create or reset session
    const newSession = {
        lastIntent: 'unknown',
        previousPrompts: [],
        lastInteraction: now
    };
    sessionCache.set(userId, newSession);
    return newSession;
};
exports.getSession = getSession;
const updateSession = (userId, prompt, intent) => {
    const session = (0, exports.getSession)(userId);
    session.lastIntent = intent;
    session.previousPrompts.push(prompt);
    // Keep only last 5 prompts
    if (session.previousPrompts.length > 5) {
        session.previousPrompts.shift();
    }
    session.lastInteraction = Date.now();
    sessionCache.set(userId, session);
};
exports.updateSession = updateSession;
