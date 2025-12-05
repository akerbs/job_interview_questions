import { Markup, Telegraf } from 'telegraf';
import type { Context } from 'telegraf';
import type { Message } from 'telegraf/typings/core/types/typegram';
import type {
  BotPlatform,
  BotContext,
  BotMessage,
  ReplyOptions,
  KeyboardButton,
  InlineKeyboardButton,
} from './bot-platform.interface.js';
import { logger } from '../logger.js';

/**
 * Адаптер для Telegram бота
 * Реализует интерфейс BotPlatform для работы с Telegram через Telegraf
 */
export class TelegramBotAdapter implements BotPlatform {
  private readonly bot: Telegraf;

  constructor(token: string) {
    this.bot = new Telegraf(token);
  }

  async launch(): Promise<void> {
    await this.bot.launch();
  }

  stop(reason: string): void {
    this.bot.stop(reason);
  }

  async sendMessage(
    chatId: string | number,
    text: string,
    options?: ReplyOptions,
  ): Promise<BotMessage> {
    const extra: any = {};

    if (options?.parseMode) {
      extra.parse_mode = options.parseMode === 'Markdown' ? 'Markdown' : options.parseMode;
    }

    if (options?.keyboard) {
      extra.reply_markup = Markup.keyboard(
        options.keyboard.map((row) => row.map((btn) => btn.text)),
      )
        .resize()
        .persistent().reply_markup;
    }

    if (options?.inlineKeyboard) {
      extra.reply_markup = Markup.inlineKeyboard(
        options.inlineKeyboard.map((row) =>
          row.map((btn) => {
            if (btn.webApp) {
              return Markup.button.webApp(btn.text, btn.webApp.url);
            }
            return Markup.button.callback(btn.text, btn.callbackData || '');
          }),
        ),
      ).reply_markup;
    }

    const message = await this.bot.telegram.sendMessage(chatId, text, extra);
    return this.toBotMessage(message);
  }

  async editMessage(
    chatId: string | number,
    messageId: string | number,
    text: string,
    options?: ReplyOptions,
  ): Promise<void> {
    const extra: any = {};

    if (options?.parseMode) {
      extra.parse_mode = options.parseMode === 'Markdown' ? 'Markdown' : options.parseMode;
    }

    if (options?.inlineKeyboard) {
      extra.reply_markup = Markup.inlineKeyboard(
        options.inlineKeyboard.map((row) =>
          row.map((btn) => {
            if (btn.webApp) {
              return Markup.button.webApp(btn.text, btn.webApp.url);
            }
            return Markup.button.callback(btn.text, btn.callbackData || '');
          }),
        ),
      ).reply_markup;
    }

    await this.bot.telegram.editMessageText(chatId, messageId, undefined, text, extra);
  }

  async deleteMessage(chatId: string | number, messageId: string | number): Promise<void> {
    await this.bot.telegram.deleteMessage(chatId, messageId);
  }

  onStart(handler: (ctx: BotContext) => Promise<void> | void): void {
    this.bot.start(async (ctx) => {
      const botCtx = this.toBotContext(ctx);
      await handler(botCtx);
    });
  }

  onCommand(command: string, handler: (ctx: BotContext) => Promise<void> | void): void {
    this.bot.command(command, async (ctx) => {
      const botCtx = this.toBotContext(ctx);
      await handler(botCtx);
    });
  }

  onText(text: string, handler: (ctx: BotContext) => Promise<void> | void): void {
    this.bot.hears(text, async (ctx) => {
      const botCtx = this.toBotContext(ctx);
      await handler(botCtx);
    });
  }

  onCallbackQuery(handler: (ctx: BotContext, data: string) => Promise<void> | void): void {
    this.bot.on('callback_query', async (ctx) => {
      if (!ctx.from || !('data' in ctx.callbackQuery)) return;

      const botCtx = this.toBotContextFromCallback(ctx);
      const data = ctx.callbackQuery.data as string;

      try {
        await handler(botCtx, data);
      } catch (error) {
        logger.error(error, 'Ошибка в обработчике callback query');
      } finally {
        try {
          await ctx.answerCbQuery().catch(() => {});
        } catch {
          // Игнорируем ошибки ответа
        }
      }
    });
  }

  onAnyText(handler: (ctx: BotContext) => Promise<void> | void): void {
    this.bot.on('text', async (ctx) => {
      const botCtx = this.toBotContext(ctx);
      await handler(botCtx);
    });
  }

  async answerCallbackQuery(callbackQueryId: string | number, text?: string): Promise<void> {
    await this.bot.telegram.answerCbQuery(String(callbackQueryId), text);
  }

  private toBotContext(ctx: Context): BotContext {
    if (!ctx.from) {
      throw new Error('Context without user');
    }

    const message = ctx.message && 'text' in ctx.message ? ctx.message : undefined;
    if (!message || !ctx.chat) {
      throw new Error('Invalid context');
    }

    return {
      user: {
        id: ctx.from.id,
        firstName: ctx.from.first_name,
        username: ctx.from.username,
        platformId: String(ctx.from.id),
      },
      message: {
        text: message.text,
        messageId: message.message_id,
        chatId: ctx.chat.id,
      },
      chatId: ctx.chat.id,
    };
  }

  private toBotContextFromCallback(ctx: Context): BotContext {
    if (!ctx.from) {
      throw new Error('Context without user');
    }

    const chatId = ctx.chat?.id || (ctx.callbackQuery && 'message' in ctx.callbackQuery && ctx.callbackQuery.message && 'chat' in ctx.callbackQuery.message ? ctx.callbackQuery.message.chat.id : undefined);
    if (!chatId) {
      throw new Error('Invalid callback context');
    }

    const messageId = ctx.callbackQuery && 'message' in ctx.callbackQuery && ctx.callbackQuery.message ? ctx.callbackQuery.message.message_id : 0;

    return {
      user: {
        id: ctx.from.id,
        firstName: ctx.from.first_name,
        username: ctx.from.username,
        platformId: String(ctx.from.id),
      },
      message: {
        text: undefined,
        messageId: messageId,
        chatId: chatId,
      },
      chatId: chatId,
    };
  }

  private toBotMessage(message: Message.TextMessage | Message.CommonMessage): BotMessage {
    return {
      text: 'text' in message ? message.text : undefined,
      messageId: message.message_id,
      chatId: message.chat.id,
    };
  }
}

