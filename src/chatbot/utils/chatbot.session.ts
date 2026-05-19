interface ChatSession {
  lastIntent: string;
  previousPrompts: string[];
  lastInteraction: number;
}

const sessionCache = new Map<string, ChatSession>();
const SESSION_EXPIRY_MS = 30 * 60 * 1000; // 30 minutes

export const getSession = (userId: string): ChatSession => {
  const session = sessionCache.get(userId);
  const now = Date.now();
  
  if (session && (now - session.lastInteraction) < SESSION_EXPIRY_MS) {
    return session;
  }
  
  // Create or reset session
  const newSession: ChatSession = {
    lastIntent: 'unknown',
    previousPrompts: [],
    lastInteraction: now
  };
  sessionCache.set(userId, newSession);
  return newSession;
};

export const updateSession = (userId: string, prompt: string, intent: string) => {
  const session = getSession(userId);
  session.lastIntent = intent;
  session.previousPrompts.push(prompt);
  
  // Keep only last 5 prompts
  if (session.previousPrompts.length > 5) {
    session.previousPrompts.shift();
  }
  
  session.lastInteraction = Date.now();
  sessionCache.set(userId, session);
};
