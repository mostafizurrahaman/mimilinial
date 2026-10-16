// src/app/modules/Questions/utils/question.utils.ts
import crypto, { randomBytes } from "crypto";

// @ts-ignore
import { slugify as bnSlugify } from "bn-translit";
import { generateSlug } from "@/app/utils";
import type {
  IMatchingPair,
  IOrderingItem,
  IQuestionOption,
} from "./question-version.interfaces";
import { Questions, type TQuestionType } from "../Questions";
import type { TQuestionVersionLanguageType } from "./question-version.constants";
import { BadRequest } from "@/app/errors";

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

  validateSingleMcqOptions(options: IQuestionOption[]): void {
    if (!Array.isArray(options)) {
      throw new BadRequest("Options must be a list.");
    }

    if (options.length < 2) {
      throw new BadRequest("At least two options are required.");
    }

    // Validate option content
    const hasEmptyContent = options.some(
      (opt) => typeof opt.content !== "string" || opt.content.trim() === "",
    );

    if (hasEmptyContent) {
      throw new BadRequest("Option content cannot be empty.");
    }

    // Validate exactly one correct option
    const correctOptions = options.filter((opt) => opt.isCorrect === true);

    if (correctOptions.length !== 1) {
      throw new BadRequest("Exactly one correct option is required.");
    }
  }

  /**
   * Multi MCQ OPTIONS Check:
   * - Min 2 Options required.
   * - One or more options should have isCorrect : true
   */
  validateMultiMcqOptions(options: IQuestionOption[]) {
    function validateMultiMcqOptions(options: IQuestionOption[]): void {
      if (!Array.isArray(options)) {
        throw new BadRequest("Options must be a list.");
      }

      if (options.length < 2) {
        throw new BadRequest("At least two options are required.");
      }

      const hasEmptyContent = options.some(
        (opt) => typeof opt.content !== "string" || opt.content.trim() === "",
      );

      if (hasEmptyContent) {
        throw new BadRequest("Option content cannot be empty.");
      }

      const correctOptions = options.filter((opt) => opt.isCorrect === true);

      if (correctOptions.length < 1) {
        throw new BadRequest("At least one correct option is required.");
      }
    }
  }

  /**
   * True / False Options Check:
   * -  2 OPTIONS required.
   * - One Option should be true.
   */

  validateTrueFalseOptions(options: IQuestionOption[]): void {
    if (!Array.isArray(options)) {
      throw new BadRequest("Options must be a list.");
    }

    if (options.length !== 2) {
      throw new BadRequest(
        "True/False questions must have exactly two options.",
      );
    }

    const correctOptions = options.filter((opt) => opt.isCorrect === true);

    if (correctOptions.length === 0) {
      throw new BadRequest("One correct option is required.");
    }

    if (correctOptions.length > 1) {
      throw new BadRequest("Only one correct option is allowed.");
    }
  }

  /**
   * Fill in the Blank Answer:
   * - Min 1 answer required into array
   * - Answer should not be empty string.
   */

  validateFillBlankAnswers(acceptedAnswers: string[]): void {
    if (!Array.isArray(acceptedAnswers)) {
      throw new BadRequest("Accepted answers must be a list.");
    }

    if (acceptedAnswers.length === 0) {
      throw new BadRequest("At least one accepted answer is required.");
    }

    // Check for empty answers
    const hasEmptyAnswer = acceptedAnswers.some(
      (ans) => typeof ans !== "string" || ans.trim().length === 0,
    );

    if (hasEmptyAnswer) {
      throw new BadRequest("Accepted answers cannot be empty.");
    }
  }

  /**
   * Matching Pair Check:
   * - Min 2 Pairs are required
   * - Each pair should have left and right side valid content.
   */

  validateMatchingPairs(pairs: IMatchingPair[]): void {
    if (!Array.isArray(pairs)) {
      throw new BadRequest("Matching pairs must be a list.");
    }

    if (pairs.length < 2) {
      throw new BadRequest("At least two matching pairs are required.");
    }

    const hasInvalidPair = pairs.some(
      (pair) =>
        typeof pair.left !== "string" ||
        pair.left.trim().length === 0 ||
        typeof pair.right !== "string" ||
        pair.right.trim().length === 0,
    );

    if (hasInvalidPair) {
      throw new BadRequest(
        "Both left and right values are required for each matching pair.",
      );
    }
  }

  /**
   * Ordering Item Checking:
   * - Min 2 Item required.
   * - Each Item should have  valid content
   * - Each item should have valid order
   */

  validateOrderingItems(items: IOrderingItem[]): void {
    if (!Array.isArray(items)) {
      throw new BadRequest("Ordering items must be a list.");
    }

    if (items.length < 2) {
      throw new BadRequest("At least two ordering items are required.");
    }

    const hasInvalidItem = items.some(
      (item) =>
        typeof item.text !== "string" ||
        item.text.trim().length === 0 ||
        typeof item.correctOrder !== "number" ||
        !Number.isInteger(item.correctOrder) ||
        item.correctOrder <= 0,
    );

    if (hasInvalidItem) {
      throw new BadRequest(
        "Each item must have non-empty text and a positive integer correctOrder.",
      );
    }

    const orders = items.map((item) => item.correctOrder);

    if (new Set(orders).size !== orders.length) {
      throw new BadRequest(
        "Each ordering item must have a unique correctOrder.",
      );
    }
  }

  //  Master Validator:
  validateByType(type: TQuestionType, payload: any) {
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
    return `Q-${randomBytes(8).toString("hex").toUpperCase()}`;
  }

  async generateUniqueQuestionCode(prefix = "Q"): Promise<string> {
    let code: string;

    do {
      code = this.generateQuestionCode(prefix);
    } while (await Questions.exists({ questionCode: code }));

    return code;
  }

  /**
   * HTML ট্যাগ ও অতিরিক্ত স্পেস রিমুভ করার ফাংশন
   */
  stripHtml(html: string): string {
    if (!html) return "";
    return html
      .replace(/<[^>]*>?/gm, " ")
      .replace(/&nbsp;/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  /**
   * টেক্সট নরমালাইজ করার ফাংশন (HTML ট্যাগ ফেলে লোয়ারকেস করা)
   */
  normalizeText(text: string): string {
    return this.stripHtml(text).toLowerCase().replace(/\s+/g, " ").trim();
  }

  /**
   * Generate Content Hash / Fingerprint
   * স্টেম এবং সংশ্লিষ্ট কনটেন্ট (অপশন, উত্তর, পেয়ার ইত্যাদি) নিয়ে SHA-256 হ্যাশ তৈরি করে।
   */
  generateContentHash(payload: {
    type: TQuestionType;
    stem: string;
    options?: IQuestionOption[];
    acceptedAnswers?: string[];
    pairs?: IMatchingPair[];
    orderingItems?: IOrderingItem[];
  }): string {
    const cleanStem = this.normalizeText(payload.stem || "");
    let signature = "";

    switch (payload.type) {
      case "single_mcq":
      case "multi_mcq":
      case "true_false": {
        const options = (payload.options || [])
          .map((opt) => this.normalizeText(opt.content || ""))
          .filter(Boolean)
          .sort();
        signature = options.join("|");
        break;
      }

      case "fill_blank": {
        const answers = (payload.acceptedAnswers || [])
          .map((ans) => this.normalizeText(ans || ""))
          .filter(Boolean)
          .sort();
        signature = answers.join("|");
        break;
      }

      case "matching": {
        const pairs = (payload.pairs || [])
          .map(
            (p) =>
              `${this.normalizeText(p.left || "")}=>${this.normalizeText(p.right || "")}`,
          )
          .sort();
        signature = pairs.join("|");
        break;
      }

      case "ordering": {
        const items = (payload.orderingItems || [])
          .map((item) => this.normalizeText(item.text || ""))
          .sort();
        signature = items.join("|");
        break;
      }

      default:
        signature = "";
    }

    const raw = `${payload.type}:::${cleanStem}:::${signature}`;
    return crypto.createHash("sha256").update(raw).digest("hex");
  }

  generateSafeQuestionSlug(stem: string, code: string): string {
    const plainText = this.stripHtml(stem);
    // take 50 charter:
    const shortText = plainText.slice(0, 50).trim();

    // is Bangla
    const isBangla = this.detectLanguage(shortText) === "bn";
    let baseSlug = isBangla ? bnSlugify(shortText) : generateSlug(shortText);

    if (!baseSlug) {
      baseSlug = "question";
    }

    // Add the unique code:
    return `${baseSlug}-${code.toLowerCase()}`;
  }
}

export const questionUtils = new QuestionUtils();
