/**
 * Интерфейс для абстракции различных платформ ботов
 * Позволяет использовать одну бизнес-логику для разных мессенджеров
 */
export interface BotUser {
  id: string | number;
  firstName?: string | null;
  username?: string | null;
  platformId: string;
}

export interface BotMessage {
  text?: string;
  messageId: string | number;
  chatId: string | number;
}

export interface BotContext {
  user: BotUser;
  message: BotMessage;
  chatId: string | number;
}

export interface ReplyOptions {
  parseMode?: 'Markdown' | 'HTML' | 'Plain';
  keyboard?: KeyboardButton[][];
  inlineKeyboard?: InlineKeyboardButton[][];
}

export interface KeyboardButton {
  text: string;
}

export interface InlineKeyboardButton {
  text: string;
  callbackData?: string;
  webApp?: { url: string };
}

export interface BotPlatform {
  launch(): Promise<void>;
  stop(reason: string): void;
  sendMessage(chatId: string | number, text: string, options?: ReplyOptions): Promise<BotMessage>;
  editMessage(chatId: string | number, messageId: string | number, text: string, options?: ReplyOptions): Promise<void>;
  deleteMessage(chatId: string | number, messageId: string | number): Promise<void>;
  onStart(handler: (ctx: BotContext) => Promise<void> | void): void;
  onCommand(command: string, handler: (ctx: BotContext) => Promise<void> | void): void;
  onText(text: string, handler: (ctx: BotContext) => Promise<void> | void): void;
  onCallbackQuery(handler: (ctx: BotContext, data: string) => Promise<void> | void): void;
  onAnyText(handler: (ctx: BotContext) => Promise<void> | void): void;
  answerCallbackQuery(callbackQueryId: string | number, text?: string): Promise<void>;
}

