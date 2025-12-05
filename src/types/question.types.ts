export interface Question {
  id: string;
  category: string;
  question: string;
  answers: [string, string, string, string];
  correctAnswerIndex: 0 | 1 | 2 | 3;
  explanation?: string;
}

export interface UserSession {
  userId: string | number;
  currentQuestionIndex: number;
  answers: Array<{
    questionId: string;
    selectedAnswerIndex: number;
    isCorrect: boolean;
    timestamp: number;
  }>;
  startTime: number;
  isActive: boolean;
}

export interface UserStatistics {
  userId: string | number;
  totalQuestions: number;
  correctAnswers: number;
  incorrectAnswers: number;
  accuracy: number;
  sessions: number;
  lastSessionTime?: number;
}

