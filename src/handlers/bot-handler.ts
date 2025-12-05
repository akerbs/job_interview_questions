import type { BotPlatform, BotContext } from '../platforms/bot-platform.interface.js';
import { QuestionService } from '../services/question.service.js';
import { SessionService } from '../services/session.service.js';
import { logger } from '../logger.js';

/**
 * Обработчик команд и логики бота
 */
export class BotHandler {
  private readonly questionService: QuestionService;
  private readonly sessionService: SessionService;

  constructor(private readonly platform: BotPlatform) {
    this.questionService = new QuestionService();
    this.sessionService = new SessionService(this.questionService);
  }

  /**
   * Регистрация всех обработчиков
   */
  registerHandlers(): void {
    this.platform.onStart(async (ctx) => {
      await this.handleStart(ctx);
    });

    this.platform.onCommand('start', async (ctx) => {
      await this.handleStart(ctx);
    });

    this.platform.onCommand('stop', async (ctx) => {
      await this.handleStop(ctx);
    });

    this.platform.onCommand('stats', async (ctx) => {
      await this.handleStats(ctx);
    });

    this.platform.onCommand('help', async (ctx) => {
      await this.handleHelp(ctx);
    });

    this.platform.onCallbackQuery(async (ctx, data) => {
      await this.handleCallbackQuery(ctx, data);
    });
  }

  /**
   * Обработка команды /start
   */
  private async handleStart(ctx: BotContext): Promise<void> {
    try {
      await this.showMainMenu(ctx);
    } catch (error) {
      logger.error(error, 'Ошибка при обработке команды /start');
      await this.platform.sendMessage(
        ctx.chatId,
        'Произошла ошибка. Попробуйте еще раз.',
      );
    }
  }

  /**
   * Показать главное меню
   */
  private async showMainMenu(ctx: BotContext): Promise<void> {
    const welcomeText = `
🎯 *Бот для подготовки к собеседованиям*
*Senior Frontend React Developer*

Выберите действие:
`;

    await this.platform.sendMessage(ctx.chatId, welcomeText, {
      parseMode: 'Markdown',
      inlineKeyboard: [
        [{ text: '▶️ Старт', callbackData: 'start_test' }],
        [{ text: '⏹️ Стоп', callbackData: 'stop_test' }],
        [{ text: '📊 Статистика', callbackData: 'show_stats' }],
      ],
    });
  }

  /**
   * Обработка команды /stop
   */
  private async handleStop(ctx: BotContext): Promise<void> {
    try {
      await this.stopTest(ctx);
    } catch (error) {
      logger.error(error, 'Ошибка при обработке команды /stop');
      await this.platform.sendMessage(
        ctx.chatId,
        'Произошла ошибка. Попробуйте еще раз.',
      );
    }
  }

  /**
   * Обработка команды /stats
   */
  private async handleStats(ctx: BotContext): Promise<void> {
    try {
      await this.showStatistics(ctx);
    } catch (error) {
      logger.error(error, 'Ошибка при обработке команды /stats');
      await this.platform.sendMessage(
        ctx.chatId,
        'Произошла ошибка. Попробуйте еще раз.',
      );
    }
  }

  /**
   * Обработка команды /help
   */
  private async handleHelp(ctx: BotContext): Promise<void> {
    const helpText = `
📚 *Помощь*

*Команды:*
/start - Главное меню
/stop - Остановить тест
/stats - Показать статистику
/help - Показать эту справку

*Как использовать:*
1. Нажмите "Старт" для начала тестирования
2. Отвечайте на вопросы, выбирая один из 4 вариантов
3. В любой момент можно остановить тест кнопкой "Стоп"
4. Просматривайте статистику в разделе "Статистика"

*Особенности:*
• Каждый вопрос имеет 4 варианта ответа
• Только один ответ правильный
• Статистика сохраняется между сессиями
• Вопросы выбираются случайно без повторений
`;

    await this.platform.sendMessage(ctx.chatId, helpText, { parseMode: 'Markdown' });
  }

  /**
   * Обработка callback query
   */
  private async handleCallbackQuery(ctx: BotContext, data: string): Promise<void> {
    try {
      if (data === 'start_test') {
        await this.startTest(ctx);
      } else if (data === 'stop_test') {
        await this.stopTest(ctx);
      } else if (data === 'show_stats') {
        await this.showStatistics(ctx);
      } else if (data === 'back_to_menu') {
        await this.showMainMenu(ctx);
      } else if (data === 'reset_stats') {
        await this.resetStatistics(ctx);
      } else if (data.startsWith('answer_')) {
        // Формат: answer_<questionId>_<answerIndex>
        const parts = data.split('_');
        if (parts.length === 3) {
          const questionId = parts[1];
          const answerIndex = parseInt(parts[2], 10);
          await this.handleAnswer(ctx, questionId, answerIndex);
        }
      }
    } catch (error) {
      logger.error(error, 'Ошибка при обработке callback query');
      await this.platform.sendMessage(
        ctx.chatId,
        'Произошла ошибка. Попробуйте еще раз.',
      );
    }
  }

  /**
   * Начать тест
   */
  private async startTest(ctx: BotContext): Promise<void> {
    const session = this.sessionService.getSession(ctx.user.id);
    if (session && session.isActive) {
      await this.platform.sendMessage(
        ctx.chatId,
        '⚠️ У вас уже есть активный тест. Завершите его или нажмите "Стоп" для остановки.',
      );
      return;
    }

    this.sessionService.startSession(ctx.user.id);
    const question = this.sessionService.getNextQuestion(ctx.user.id);

    if (!question) {
      await this.platform.sendMessage(
        ctx.chatId,
        '❌ Не удалось получить вопрос. Попробуйте еще раз.',
      );
      return;
    }

    await this.sendQuestion(ctx, question);
  }

  /**
   * Остановить тест
   */
  private async stopTest(ctx: BotContext): Promise<void> {
    const session = this.sessionService.getSession(ctx.user.id);
    if (!session || !session.isActive) {
      await this.platform.sendMessage(
        ctx.chatId,
        'ℹ️ У вас нет активного теста.',
      );
      await this.showMainMenu(ctx);
      return;
    }

    this.sessionService.stopSession(ctx.user.id);
    const stats = this.sessionService.getStatistics(ctx.user.id);

    const sessionStats = session.answers.length > 0
      ? session.answers.reduce(
          (acc, answer) => {
            if (answer.isCorrect) acc.correct++;
            else acc.incorrect++;
            return acc;
          },
          { correct: 0, incorrect: 0 },
        )
      : { correct: 0, incorrect: 0 };

    const message = `
⏹️ *Тест остановлен*

*Результаты текущей сессии:*
✅ Правильных ответов: ${sessionStats.correct}
❌ Неправильных ответов: ${sessionStats.incorrect}
📊 Всего вопросов: ${session.answers.length}

*Общая статистика:*
✅ Правильных: ${stats.correctAnswers}
❌ Неправильных: ${stats.incorrectAnswers}
📊 Всего вопросов: ${stats.totalQuestions}
📈 Точность: ${(stats.accuracy * 100).toFixed(1)}%
🎯 Сессий: ${stats.sessions}
`;

    await this.platform.sendMessage(ctx.chatId, message, {
      parseMode: 'Markdown',
      inlineKeyboard: [[{ text: '🏠 Главное меню', callbackData: 'back_to_menu' }]],
    });
  }

  /**
   * Показать статистику
   */
  private async showStatistics(ctx: BotContext): Promise<void> {
    const stats = this.sessionService.getStatistics(ctx.user.id);

    const message = `
📊 *Ваша статистика*

*Общая статистика:*
✅ Правильных ответов: ${stats.correctAnswers}
❌ Неправильных ответов: ${stats.incorrectAnswers}
📊 Всего вопросов: ${stats.totalQuestions}
📈 Точность: ${stats.totalQuestions > 0 ? (stats.accuracy * 100).toFixed(1) : 0}%
🎯 Сессий: ${stats.sessions}
${stats.lastSessionTime ? `🕐 Последняя сессия: ${new Date(stats.lastSessionTime).toLocaleString('ru-RU')}` : ''}
`;

    await this.platform.sendMessage(ctx.chatId, message, {
      parseMode: 'Markdown',
      inlineKeyboard: [
        [{ text: '🔄 Сбросить статистику', callbackData: 'reset_stats' }],
        [{ text: '🏠 Главное меню', callbackData: 'back_to_menu' }],
      ],
    });
  }

  /**
   * Отправить вопрос пользователю
   */
  private async sendQuestion(ctx: BotContext, question: any): Promise<void> {
    const questionText = `
📝 *Вопрос ${question.category}*

${question.question}

Выберите правильный ответ:
`;

    const keyboard = question.answers.map((answer: string, index: number) => [
      {
        text: `${String.fromCharCode(65 + index)}. ${answer}`,
        callbackData: `answer_${question.id}_${index}`,
      },
    ]);

    keyboard.push([{ text: '⏹️ Остановить тест', callbackData: 'stop_test' }]);

    await this.platform.sendMessage(ctx.chatId, questionText, {
      parseMode: 'Markdown',
      inlineKeyboard: keyboard,
    });
  }

  /**
   * Сбросить статистику
   */
  private async resetStatistics(ctx: BotContext): Promise<void> {
    this.sessionService.resetStatistics(ctx.user.id);
    await this.platform.sendMessage(
      ctx.chatId,
      '✅ Статистика сброшена.',
      {
        inlineKeyboard: [[{ text: '🏠 Главное меню', callbackData: 'back_to_menu' }]],
      },
    );
  }

  /**
   * Обработать ответ пользователя
   */
  private async handleAnswer(
    ctx: BotContext,
    questionId: string,
    answerIndex: number,
  ): Promise<void> {
    const isCorrect = this.sessionService.addAnswer(
      ctx.user.id,
      questionId,
      answerIndex,
    );

    const question = this.questionService.getQuestionById(questionId);
    if (!question) {
      await this.platform.sendMessage(
        ctx.chatId,
        '❌ Ошибка: вопрос не найден.',
      );
      return;
    }

    const resultEmoji = isCorrect ? '✅' : '❌';
    const resultText = isCorrect ? 'Правильно!' : 'Неправильно';
    const userAnswer = question.answers[answerIndex];
    const correctAnswer = question.answers[question.correctAnswerIndex];

    // Формируем развёрнутый ответ со всеми вариантами
    let message = `\n${resultEmoji} *${resultText}*\n`;
    message += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;
    
    // Показываем все варианты ответов с отметками
    message += `📋 *Все варианты ответов:*\n\n`;
    
    question.answers.forEach((answer, index) => {
      const letter = String.fromCharCode(65 + index); // A, B, C, D
      let prefix = '';
      let suffix = '';
      
      if (index === question.correctAnswerIndex) {
        prefix = '✅ '; // Правильный ответ
        suffix = ' ← *ПРАВИЛЬНЫЙ ОТВЕТ*';
      } else if (index === answerIndex && !isCorrect) {
        prefix = '❌ '; // Неправильный ответ пользователя
        suffix = ' ← *Ваш ответ*';
      } else {
        prefix = '⚪ '; // Остальные варианты
      }
      
      message += `${prefix}*${letter}.* ${answer}${suffix}\n\n`;
    });

    message += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;
    
    if (!isCorrect) {
      message += `❌ *Ваш ответ:* ${userAnswer}\n\n`;
    }
    
    message += `✅ *Правильный ответ:* ${correctAnswer}\n\n`;

    if (question.explanation) {
      message += `💡 *Объяснение:*\n\n${question.explanation}\n\n`;
    }

    await this.platform.sendMessage(ctx.chatId, message, {
      parseMode: 'Markdown',
    });

    // Получаем следующий вопрос
    const nextQuestion = this.sessionService.getNextQuestion(ctx.user.id);

    if (nextQuestion) {
      // Небольшая задержка перед следующим вопросом
      await new Promise((resolve) => setTimeout(resolve, 1500));
      await this.sendQuestion(ctx, nextQuestion);
    } else {
      // Все вопросы отвечены или сессия завершена
      await this.platform.sendMessage(
        ctx.chatId,
        '🎉 Вы ответили на все доступные вопросы!',
      );
      this.sessionService.stopSession(ctx.user.id);
      await this.showMainMenu(ctx);
    }
  }
}

