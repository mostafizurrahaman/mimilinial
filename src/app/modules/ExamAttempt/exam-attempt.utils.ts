import { Types } from "mongoose";
import type {
  TAttemptItem,
  IMatchingPairAnswer,
} from "./exam-attempt.interfaces";
import type { IQuestionOption, TQuestionType } from "../Questions";

export interface IEvaluationResult {
  isAnswered: boolean;
  isCorrect: boolean;
}

export interface ISubjectScoreSummary {
  subjectId: Types.ObjectId;
  subjectName?: string;
  total: number;
  answered: number;
  correct: number;
  wrong: number;
  score: number;
}

export interface IScorecardResult {
  totalQuestions: number;
  totalAnswered: number;
  totalSkipped: number;
  correctCount: number;
  wrongCount: number;
  obtainedMarks: number;
  deductedMarks: number;
  finalScore: number;
  percentage: number;
  isPassed: boolean;
  subjectBreakdown: ISubjectScoreSummary[];
}

export class ExamAttemptUtils {
  /**
   * 1. Calculate Exact Server Expiry Time
   * Caps the expiry to the live exam endTime if provided.
   */
  static calculateExpiresAt(
    startedAt: Date,
    durationMins: number,
    liveEndTime?: Date | null,
  ): Date {
    const calculatedEndMs = startedAt.getTime() + durationMins * 60 * 1000;
    if (liveEndTime) {
      const liveEndMs = new Date(liveEndTime).getTime();
      return new Date(Math.min(calculatedEndMs, liveEndMs));
    }
    return new Date(calculatedEndMs);
  }

  /**
   * 2. Check if an attempt is expired (with an optional grace period in seconds)
   */
  static isAttemptExpired(expiresAt: Date, graceSeconds: number = 10): boolean {
    const bufferMs = graceSeconds * 1000;
    return Date.now() > expiresAt.getTime() + bufferMs;
  }

  /**
   * 3. Fisher-Yates Array Shuffle (pure)
   */
  static shuffleArray<T>(array: T[]): T[] {
    const copy = [...array];
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const temp = copy[i]!;
      copy[i] = copy[j]!;
      copy[j] = temp;
    }
    return copy;
  }

  /**
   * 4. Sanitize Questions for Student
   * Removes `isCorrect` from options and explanations before sending to the student client.
   */
  static sanitizeQuestionForStudent(
    version: any,
    isOptionShuffled: boolean = false,
  ): Record<string, any> {
    const plain = version.toObject ? version.toObject() : { ...version };

    const sanitized: Record<string, any> = {
      _id: plain._id,
      question: plain.question,
      type: plain.type,
      stem: plain.stem,
      plainStem: plain.plainStem,
      mediaUrl: plain.mediaUrl,
      language: plain.language,
    };

    if (plain.options && Array.isArray(plain.options)) {
      let options = plain.options.map((opt: any) => ({
        _id: opt._id,
        content: opt.content,
        mediaUrl: opt.mediaUrl,
        sortOrder: opt.sortOrder,
      }));
      if (isOptionShuffled) {
        options = ExamAttemptUtils.shuffleArray(options);
      }
      sanitized.options = options;
    }

    if (plain.pairs && Array.isArray(plain.pairs)) {
      // For matching: shuffle right sides so user matches them
      const lefts = plain.pairs.map((p: any) => p.left);
      let rights = plain.pairs.map((p: any) => p.right);
      rights = ExamAttemptUtils.shuffleArray(rights);
      sanitized.matchingData = { lefts, rights };
    }

    if (plain.orderingItems && Array.isArray(plain.orderingItems)) {
      // For ordering: shuffle items initially so user can order them
      let items = plain.orderingItems.map((item: any) => item.text);
      items = ExamAttemptUtils.shuffleArray(items);
      sanitized.orderingItems = items;
    }

    return sanitized;
  }

  /**
   * 5. Pure Answer Evaluation Function
   * Accurately grades all 6 question types.
   */
  static evaluateAnswer(
    questionType: TQuestionType,
    questionVersion: any,
    userAnswer: any,
  ): IEvaluationResult {
    if (userAnswer === null || userAnswer === undefined) {
      return { isAnswered: false, isCorrect: false };
    }

    switch (questionType) {
      case "single_mcq":
      case "true_false": {
        const answerStr = userAnswer?.toString().trim();
        if (!answerStr) return { isAnswered: false, isCorrect: false };

        const correctOption = questionVersion.options?.find(
          (opt: any) => opt.isCorrect === true,
        );
        const isCorrect = correctOption?._id.toString() === answerStr;
        return { isAnswered: true, isCorrect };
      }

      case "multi_mcq": {
        if (!Array.isArray(userAnswer) || userAnswer.length === 0) {
          return { isAnswered: false, isCorrect: false };
        }
        const userSet = new Set(userAnswer.map((id) => id?.toString().trim()));
        const correctSet = new Set(
          questionVersion.options
            ?.filter((opt: any) => opt.isCorrect === true)
            ?.map((opt: any) => opt._id.toString()),
        );

        if (userSet.size !== correctSet.size) {
          return { isAnswered: true, isCorrect: false };
        }
        for (const id of userSet) {
          if (!correctSet.has(id)) {
            return { isAnswered: true, isCorrect: false };
          }
        }
        return { isAnswered: true, isCorrect: true };
      }

      case "fill_blank": {
        const text = String(userAnswer).trim();
        if (!text) return { isAnswered: false, isCorrect: false };

        const acceptedAnswers: string[] = questionVersion.acceptedAnswers || [];
        const isCaseSensitive: boolean = Boolean(
          questionVersion.isCaseSensitive,
        );

        const isCorrect = acceptedAnswers.some((ans) => {
          if (isCaseSensitive) {
            return ans.trim() === text;
          }
          return ans.trim().toLowerCase() === text.toLowerCase();
        });
        return { isAnswered: true, isCorrect };
      }

      case "matching": {
        if (!Array.isArray(userAnswer) || userAnswer.length === 0) {
          return { isAnswered: false, isCorrect: false };
        }
        const pairs: Array<{ left: string; right: string }> =
          questionVersion.pairs || [];
        if (userAnswer.length !== pairs.length) {
          return { isAnswered: true, isCorrect: false };
        }

        const isCorrect = pairs.every((correctPair) => {
          const matched = (userAnswer as IMatchingPairAnswer[]).find(
            (u) => u.left?.trim() === correctPair.left?.trim(),
          );
          return matched && matched.right?.trim() === correctPair.right?.trim();
        });
        return { isAnswered: true, isCorrect: Boolean(isCorrect) };
      }

      case "ordering": {
        if (!Array.isArray(userAnswer) || userAnswer.length === 0) {
          return { isAnswered: false, isCorrect: false };
        }
        const orderingItems: Array<{ text: string; correctOrder: number }> =
          questionVersion.orderingItems || [];

        const correctSequence = [...orderingItems]
          .sort((a, b) => a.correctOrder - b.correctOrder)
          .map((item) => item.text.trim());

        const userSequence = (userAnswer as string[]).map((s) => s.trim());

        const isCorrect =
          JSON.stringify(userSequence) === JSON.stringify(correctSequence);
        return { isAnswered: true, isCorrect };
      }

      default:
        return { isAnswered: false, isCorrect: false };
    }
  }

  /**
   * 6. Calculate Final Scorecard & Subject Breakdown
   */
  static calculateScorecard(
    items: TAttemptItem[],
    versionsMap: Map<string, any>,
    mappingsMap: Map<string, any>,
    rules: {
      marksPerQuestion: number;
      negativeMarks: number;
      passMarks: number;
    },
  ): IScorecardResult {
    const totalQuestions = items.length;
    let totalAnswered = 0;
    let totalSkipped = 0;
    let correctCount = 0;
    let wrongCount = 0;

    // Subject breakdown accumulator
    const subjectMap = new Map<string, ISubjectScoreSummary>();

    for (const item of items) {
      const version = item.versionId
        ? versionsMap.get(item.versionId.toString())
        : null;

      const mapping = item.mappingId
        ? mappingsMap.get(item.mappingId.toString())
        : null;

      const subjectId = mapping?.subject?._id || mapping?.subject;
      const subjectKey = subjectId ? subjectId.toString() : "unknown";

      if (!subjectMap.has(subjectKey) && subjectId) {
        subjectMap.set(subjectKey, {
          subjectId: new Types.ObjectId(subjectKey),
          subjectName: mapping?.subject?.name || "Subject",
          total: 0,
          answered: 0,
          correct: 0,
          wrong: 0,
          score: 0,
        });
      }

      const subjectStats = subjectMap.get(subjectKey);
      if (subjectStats) subjectStats.total += 1;

      if (!version) {
        totalSkipped += 1;
        continue;
      }

      const evalResult = ExamAttemptUtils.evaluateAnswer(
        item.questionType as TQuestionType,
        version,
        item.userAnswer,
      );

      if (!evalResult.isAnswered) {
        totalSkipped += 1;
      } else {
        totalAnswered += 1;
        if (subjectStats) subjectStats.answered += 1;

        if (evalResult.isCorrect) {
          correctCount += 1;
          if (subjectStats) {
            subjectStats.correct += 1;
            subjectStats.score += rules.marksPerQuestion;
          }
        } else {
          wrongCount += 1;
          if (subjectStats) {
            subjectStats.wrong += 1;
            subjectStats.score -= rules.negativeMarks;
          }
        }
      }
    }

    const obtainedMarks =
      Math.round(correctCount * rules.marksPerQuestion * 100) / 100;
    const deductedMarks =
      Math.round(wrongCount * rules.negativeMarks * 100) / 100;
    const finalScore = Math.round((obtainedMarks - deductedMarks) * 100) / 100;

    const totalPossibleMarks =
      Math.round(totalQuestions * rules.marksPerQuestion * 100) / 100;

    const percentage =
      totalPossibleMarks > 0
        ? Math.round((Math.max(0, finalScore) / totalPossibleMarks) * 10000) /
          100
        : 0;

    const isPassed = finalScore >= rules.passMarks;

    const subjectBreakdown = Array.from(subjectMap.values()).map((s) => ({
      ...s,
      score: Math.round(s.score * 100) / 100,
    }));

    return {
      totalQuestions,
      totalAnswered,
      totalSkipped,
      correctCount,
      wrongCount,
      obtainedMarks,
      deductedMarks,
      finalScore,
      percentage,
      isPassed,
      subjectBreakdown,
    };
  }
}

export const examAttemptUtils = ExamAttemptUtils;
