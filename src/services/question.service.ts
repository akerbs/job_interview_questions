import { questions } from '../data/questions.js';
import type { Question } from '../types/question.types.js';

export class QuestionService {
  /**
   * Получить случайный вопрос
   */
  getRandomQuestion(): Question {
    const randomIndex = Math.floor(Math.random() * questions.length);
    return questions[randomIndex];
  }

  /**
   * Получить вопрос по ID
   */
  getQuestionById(id: string): Question | undefined {
    return questions.find((q) => q.id === id);
  }

  /**
   * Получить все вопросы
   */
  getAllQuestions(): Question[] {
    return questions;
  }

  /**
   * Получить вопросы по категории
   */
  getQuestionsByCategory(category: string): Question[] {
    return questions.filter((q) => q.category === category);
  }

  /**
   * Получить случайные вопросы (без повторений)
   */
  getRandomQuestions(count: number): Question[] {
    const shuffled = [...questions].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, Math.min(count, questions.length));
  }

  /**
   * Получить все категории
   */
  getCategories(): string[] {
    const categories = new Set(questions.map((q) => q.category));
    return Array.from(categories);
  }

  /**
   * Проверить правильность ответа
   */
  checkAnswer(questionId: string, selectedAnswerIndex: number): boolean {
    const question = this.getQuestionById(questionId);
    if (!question) {
      return false;
    }
    return question.correctAnswerIndex === selectedAnswerIndex;
  }
}

