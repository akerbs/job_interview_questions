import type { UserSession, UserStatistics } from '../types/question.types.js';
import { QuestionService } from './question.service.js';

export class SessionService {
  private sessions: Map<string | number, UserSession> = new Map();
  private statistics: Map<string | number, UserStatistics> = new Map();
  private readonly questionService: QuestionService;

  constructor(questionService: QuestionService) {
    this.questionService = questionService;
  }

  /**
   * Начать новую сессию тестирования
   */
  startSession(userId: string | number): UserSession {
    const session: UserSession = {
      userId,
      currentQuestionIndex: 0,
      answers: [],
      startTime: Date.now(),
      isActive: true,
    };

    this.sessions.set(userId, session);
    return session;
  }

  /**
   * Получить текущую сессию
   */
  getSession(userId: string | number): UserSession | undefined {
    return this.sessions.get(userId);
  }

  /**
   * Остановить сессию
   */
  stopSession(userId: string | number): void {
    const session = this.getSession(userId);
    if (session) {
      session.isActive = false;
      this.updateStatistics(userId, session);
    }
  }

  /**
   * Добавить ответ в сессию
   */
  addAnswer(
    userId: string | number,
    questionId: string,
    selectedAnswerIndex: number,
  ): boolean {
    const session = this.getSession(userId);
    if (!session || !session.isActive) {
      return false;
    }

    const isCorrect = this.questionService.checkAnswer(questionId, selectedAnswerIndex);

    session.answers.push({
      questionId,
      selectedAnswerIndex,
      isCorrect,
      timestamp: Date.now(),
    });

    session.currentQuestionIndex += 1;

    return isCorrect;
  }

  /**
   * Получить следующий вопрос для сессии
   */
  getNextQuestion(userId: string | number) {
    const session = this.getSession(userId);
    if (!session || !session.isActive) {
      return null;
    }

    // Получаем случайный вопрос, исключая уже отвеченные
    const answeredQuestionIds = new Set(session.answers.map((a) => a.questionId));
    const availableQuestions = this.questionService
      .getAllQuestions()
      .filter((q) => !answeredQuestionIds.has(q.id));

    if (availableQuestions.length === 0) {
      // Все вопросы отвечены, завершаем сессию
      this.stopSession(userId);
      return null;
    }

    const randomIndex = Math.floor(Math.random() * availableQuestions.length);
    return availableQuestions[randomIndex];
  }

  /**
   * Обновить статистику пользователя
   */
  private updateStatistics(userId: string | number, session: UserSession): void {
    const existingStats = this.statistics.get(userId);
    const correctAnswers = session.answers.filter((a) => a.isCorrect).length;
    const incorrectAnswers = session.answers.filter((a) => !a.isCorrect).length;
    const totalAnswers = session.answers.length;

    const stats: UserStatistics = {
      userId,
      totalQuestions: (existingStats?.totalQuestions || 0) + totalAnswers,
      correctAnswers: (existingStats?.correctAnswers || 0) + correctAnswers,
      incorrectAnswers: (existingStats?.incorrectAnswers || 0) + incorrectAnswers,
      accuracy:
        (existingStats?.totalQuestions || 0) + totalAnswers > 0
          ? ((existingStats?.correctAnswers || 0) + correctAnswers) /
            ((existingStats?.totalQuestions || 0) + totalAnswers)
          : 0,
      sessions: (existingStats?.sessions || 0) + 1,
      lastSessionTime: Date.now(),
    };

    this.statistics.set(userId, stats);
  }

  /**
   * Получить статистику пользователя
   */
  getStatistics(userId: string | number): UserStatistics {
    const stats = this.statistics.get(userId);
    if (!stats) {
      return {
        userId,
        totalQuestions: 0,
        correctAnswers: 0,
        incorrectAnswers: 0,
        accuracy: 0,
        sessions: 0,
      };
    }
    return stats;
  }

  /**
   * Сбросить статистику пользователя
   */
  resetStatistics(userId: string | number): void {
    this.statistics.delete(userId);
  }

  /**
   * Проверить, есть ли активная сессия
   */
  hasActiveSession(userId: string | number): boolean {
    const session = this.getSession(userId);
    return session?.isActive ?? false;
  }
}

