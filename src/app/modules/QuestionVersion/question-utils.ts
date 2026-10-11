// src/app/modules/Questions/utils/question.utils.ts

// @ts-ignore
import { slugify as bnSlugify } from "bn-translit";
import { generateSlug } from "@/app/utils";
import type {
  IMatchingPair,
  IOrderingItem,
  IQuestionOption,
} from "./question-version.interfaces";
import type { TQuestionType } from "../Questions";
import type { TQuestionVersionLanguageType } from "./question-version.constants";

export class QuestionUtils {
  /**
   * -----------------------------
   *        QUESTION VALIDATIONS
   * ------------------------------
   */

  /**
   * SINGLE MCQ
   * @Array and must have @two options:
   * @Options should have content
   * Min. 1 option should be @isConnect
   *
   */
  validateSingleMcqOptions(options: IQuestionOption[]): boolean {
    if (!Array.isArray(options) || options.length < 2) return false;

    // Check options content:
    const hasEmptyContent = options.some(
      (opt) => !opt.content || opt.content.trim() === "",
    );
    if (hasEmptyContent) return false;

    const correctOptions = options.filter((opt) => opt.isCorrect);
    return correctOptions.length === 1;
  }

  /**
   * Multi MCQ OPTIONS Check:
   * - Min 2 Options required.
   * - One or more options should have isCorrect : true
   */
  validateMultiMcqOptions(options: IQuestionOption[]): boolean {
    if (!Array.isArray(options) || options.length < 2) return false;

    const hasEmptyContent = options.some(
      (opt) => !opt.content || opt.content.trim() === "",
    );
    if (hasEmptyContent) return false;

    const correctOptions = options.filter((opt) => opt.isCorrect);
    return correctOptions.length >= 1;
  }

  /**
   * True / False Options Check:
   * -  2 OPTIONS required.
   * - One Option should be true.
   */
  validateTrueFalseOptions(options: IQuestionOption[]): boolean {
    if (!Array.isArray(options) || options.length !== 2) return false;

    const correctOptions = options.filter((opt) => opt.isCorrect);
    return correctOptions.length === 1;
  }

  /**
   * Fill in the Blank Answer:
   * - Min 1 answer required into array
   * - Answer should not be empty string.
   */
  validateFillBlankAnswers(acceptedAnswers: string[]): boolean {
    if (!Array.isArray(acceptedAnswers) || acceptedAnswers.length === 0) {
      return false;
    }

    // Check is any answer is empty or not ?:
    return acceptedAnswers.every(
      (ans) => typeof ans === "string" && ans.trim().length > 0,
    );
  }

  /**
   * Matching Pair Check:
   * - Min 2 Pairs are required
   * - Each pair should have left and right side valid content.
   */
  validateMatchingPairs(pairs: IMatchingPair[]): boolean {
    if (!Array.isArray(pairs) || pairs.length < 2) return false;

    return pairs.every(
      (pair) =>
        typeof pair.left === "string" &&
        pair.left.trim().length > 0 &&
        typeof pair.right === "string" &&
        pair.right.trim().length > 0,
    );
  }

  /**
   * Ordering Item Checking:
   * - Min 2 Item required.
   * - Each Item should have  valid content
   * - Each item should have valid order
   */
  validateOrderingItems(items: IOrderingItem[]): boolean {
    if (!Array.isArray(items) || items.length < 2) return false;

    return items.every(
      (item) =>
        typeof item.text === "string" &&
        item.text.trim().length > 0 &&
        typeof item.correctOrder === "number" &&
        item.correctOrder > 0,
    );
  }

  //  Master Validator:
  validateByType(type: TQuestionType, payload: any): boolean {
    switch (type) {
      case "single_mcq":
        return this.validateSingleMcqOptions(payload.options);
      case "multi_mcq":
        return this.validateMultiMcqOptions(payload.options);
      case "true_false":
        return this.validateTrueFalseOptions(payload.options);
      case "fill_blank":
        return this.validateFillBlankAnswers(payload.acceptedAnswers);
      case "matching":
        return this.validateMatchingPairs(payload.pairs);
      case "ordering":
        return this.validateOrderingItems(payload.orderingItems);
      default:
        return false;
    }
  }

  // ========================================================
  // 2. HELPER METHODS FOR QUESTION VERSION:
  // ========================================================

  /**
   *  Generate Question Slug:
   */
  generateQuestionSlug(stem: string, code: string): string {
    const baseSlug = bnSlugify(stem);
    const cleanCode = generateSlug(code);
    return `${baseSlug}-${cleanCode}`;
  }

  /**
   *  Detect Language Function
   */
  detectLanguage(text: string): TQuestionVersionLanguageType {
    const banglaMatches = text.match(/[\u0980-\u09FF]/g) || [];
    const englishMatches = text.match(/[a-zA-Z]/g) || [];

    return banglaMatches.length >= englishMatches.length &&
      banglaMatches.length > 0
      ? "bn"
      : "en";
  }

  /**
   * Generate Unique (Question Code Generate)
   */
  generateQuestionCode(prefix: string = "Q"): string {
    const randomNum = Math.floor(100000 + Math.random() * 900000);
    return `${prefix}-${randomNum}`;
  }
}

export const questionUtils = new QuestionUtils();
