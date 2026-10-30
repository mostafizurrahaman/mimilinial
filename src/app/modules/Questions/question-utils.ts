// src/app/modules/Questions/utils/question.utils.ts
import crypto, { randomBytes } from "crypto";

// @ts-ignore
import { slugify as bnSlugify } from "bn-translit";
import { generateSlug } from "@/app/utils";
import { Question } from "./questions.model";
import { BadRequest, ConflictError } from "@/app/errors";
import type {
  IMatchingPair,
  IOrderingItem,
  IQuestionOption,
} from "./questions.interfaces";
import type {
  TQuestionType,
  TQuestionVersionLanguageType,
} from "./questions.constants";
import { extractCloudinaryImages } from "@/app/utils/extract-cloudinary-images";

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

    const hasDuplicateOption = questionUtils.hasDuplicateOptions(
      options as IQuestionOption[],
    );

    if (hasDuplicateOption) {
      throw new ConflictError("Duplicate options are not allowed.");
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

    const hasDuplicateOption = questionUtils.hasDuplicateOptions(
      options as IQuestionOption[],
    );

    if (hasDuplicateOption) {
      throw new ConflictError("Duplicate options are not allowed.");
    }

    const correctOptions = options.filter((opt) => opt.isCorrect === true);

    if (correctOptions.length < 1) {
      throw new BadRequest("At least one correct option is required.");
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

    const firstOpt = options[0];
    const secondOpt = options[1];

    if (!firstOpt || !secondOpt) {
      throw new BadRequest(
        "True/False questions must have exactly two options.",
      );
    }

    const firstContent =
      typeof firstOpt.content === "string"
        ? firstOpt.content.trim().toLowerCase()
        : "";
    const secondContent =
      typeof secondOpt.content === "string"
        ? secondOpt.content.trim().toLowerCase()
        : "";

    if (
      !["true", "false"].includes(firstContent) ||
      !["true", "false"].includes(secondContent)
    ) {
      throw new BadRequest(
        "True/False question options content must be 'true' or 'false'.",
      );
    }

    if (firstContent === secondContent) {
      throw new ConflictError(
        "True/False questions must have one 'true' and one 'false' option.",
      );
    }

    const hasDuplicateOption = this.hasDuplicateOptions(options);

    if (hasDuplicateOption) {
      throw new ConflictError("Duplicate options are not allowed.");
    }

    const correctOptions = options.filter((opt) => opt.isCorrect === true);

    if (correctOptions.length !== 1) {
      throw new BadRequest("Exactly one correct option is required.");
    }

    if (firstOpt.sortOrder === secondOpt.sortOrder) {
      throw new BadRequest("Options must have distinct sort orders.");
    }
  }

  /**
   * Fill in the Blank Answer:
   * - Min 1 answer required into array
   * - Answer should not be empty string.
   * - No duplicate answers
   */

  validateFillBlankAnswers(
    acceptedAnswers: string[],
    isCaseSensitive: boolean = false,
  ): void {
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

    // Check for duplicate answers
    const seen = new Set<string>();
    for (const ans of acceptedAnswers) {
      const normalized = isCaseSensitive
        ? ans.trim()
        : ans.trim().toLowerCase();
      if (seen.has(normalized)) {
        throw new ConflictError("Duplicate accepted answers are not allowed.");
      }
      seen.add(normalized);
    }
  }

  /**
   * Matching Pair Check:
   * - Min 2 Pairs are required
   * - Each pair should have left and right side valid content.
   * - Distinct left side items (no ambiguity)
   * - Distinct right side items (1-to-1 match)
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

    // Check duplicate left items
    const leftSet = new Set<string>();
    for (const pair of pairs) {
      const normalizedLeft = this.normalizeText(pair.left);
      if (leftSet.has(normalizedLeft)) {
        throw new ConflictError(
          "Duplicate left side items are not allowed in matching pairs.",
        );
      }
      leftSet.add(normalizedLeft);
    }

    // Check duplicate right items
    const rightSet = new Set<string>();
    for (const pair of pairs) {
      const normalizedRight = this.normalizeText(pair.right);
      if (rightSet.has(normalizedRight)) {
        throw new ConflictError(
          "Duplicate right side items are not allowed in matching pairs.",
        );
      }
      rightSet.add(normalizedRight);
    }
  }

  /**
   * Ordering Item Checking:
   * - Min 2 Item required.
   * - Each Item should have valid content
   * - Each item must have unique text
   * - Each item should have unique positive integer order
   * - Correct orders must form sequential 1 to N sequence
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

    // Check duplicate item texts
    const seenTexts = new Set<string>();
    for (const item of items) {
      const normalized = this.normalizeText(item.text);
      if (seenTexts.has(normalized)) {
        throw new ConflictError(
          "Duplicate item texts are not allowed in ordering items.",
        );
      }
      seenTexts.add(normalized);
    }

    const orders = items.map((item) => item.correctOrder);

    if (new Set(orders).size !== orders.length) {
      throw new BadRequest(
        "Each ordering item must have a unique correctOrder.",
      );
    }

    // Check sequential sequence from 1 to N
    const sortedOrders = [...orders].sort((a, b) => a - b);
    for (let i = 0; i < sortedOrders.length; i++) {
      if (sortedOrders[i] !== i + 1) {
        throw new BadRequest(
          `Correct order must be sequential starting from 1 to ${items.length}.`,
        );
      }
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
        return this.validateFillBlankAnswers(
          payload.acceptedAnswers,
          payload.isCaseSensitive,
        );
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
    return `${prefix?.trim()}-${randomBytes(8).toString("hex").toUpperCase()}`;
  }

  async generateUniqueQuestionCode(prefix = "Q"): Promise<string> {
    let code: string;

    do {
      code = this.generateQuestionCode(prefix);
    } while (await Question.exists({ code }));

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

  hasDuplicateOptions = (options: IQuestionOption[]): boolean => {
    const seen = new Set<string>();

    for (const option of options) {
      const normalizedContent = option.content
        .trim()
        .replace(/\s+/g, " ")
        .toLowerCase();

      if (seen.has(normalizedContent)) {
        return true;
      }

      seen.add(normalizedContent);
    }

    return false;
  };

  /**
   * Extract all Cloudinary media URLs from a question version document
   */
  extractMediaUrlsFromVersion(version: any): Set<string> {
    const mediaUrls = new Set<string>();
    if (!version) return mediaUrls;

    if (version.mediaUrl) {
      mediaUrls.add(version.mediaUrl);
    }

    const contents: string[] = [];
    if (version.stem) contents.push(version.stem);
    if (version.explanation) contents.push(version.explanation);

    if (Array.isArray(version.options)) {
      version.options.forEach((opt: any) => {
        if (opt?.mediaUrl) mediaUrls.add(opt.mediaUrl);
        if (opt?.content) contents.push(opt.content);
      });
    }

    if (Array.isArray(version.pairs)) {
      version.pairs.forEach((pair: any) => {
        if (pair?.left) contents.push(pair.left);
        if (pair?.right) contents.push(pair.right);
      });
    }

    if (Array.isArray(version.orderingItems)) {
      version.orderingItems.forEach((item: any) => {
        if (item?.text) contents.push(item.text);
      });
    }

    const contentUrls = extractCloudinaryImages(contents);
    contentUrls.forEach((url) => mediaUrls.add(url));

    return mediaUrls;
  }

  /**
   * Check if the new version payload has any actual content changes compared to currentVersion.
   * Compares stem, options (content, isCorrect, mediaUrl, sortOrder),
   * acceptedAnswers, isCaseSensitive, pairs, orderingItems, explanation, and mediaUrl.
   */
  hasVersionContentChanged(payload: {
    type: TQuestionType;
    currentVersion: any;
    newStem: string;
    newExplanation?: string | null;
    newMediaUrl?: string | null;
    newOptions?: IQuestionOption[];
    newAcceptedAnswers?: string[];
    newIsCaseSensitive?: boolean;
    newPairs?: IMatchingPair[];
    newOrderingItems?: IOrderingItem[];
  }): boolean {
    const normalizeStr = (str?: string | null): string => {
      if (!str) return "";
      return str.trim();
    };

    const {
      type,
      currentVersion,
      newStem,
      newExplanation,
      newMediaUrl,
      newOptions,
      newAcceptedAnswers,
      newIsCaseSensitive,
      newPairs,
      newOrderingItems,
    } = payload;

    if (!currentVersion) return true;

    // 1. Stem comparison
    if (normalizeStr(currentVersion.stem) !== normalizeStr(newStem)) {
      return true;
    }

    // 2. Explanation comparison (treat undefined, null, and empty string uniformly)
    if (
      normalizeStr(currentVersion.explanation) !== normalizeStr(newExplanation)
    ) {
      return true;
    }

    // 3. Media URL comparison
    if (normalizeStr(currentVersion.mediaUrl) !== normalizeStr(newMediaUrl)) {
      return true;
    }

    // 4. Type-specific comparisons
    switch (type) {
      case "single_mcq":
      case "multi_mcq":
      case "true_false": {
        const currentOpts: IQuestionOption[] = currentVersion.options || [];
        const nextOpts: IQuestionOption[] = newOptions || [];

        if (currentOpts.length !== nextOpts.length) {
          return true;
        }

        for (let i = 0; i < nextOpts.length; i++) {
          const cur = currentOpts[i];
          const next = nextOpts[i];

          if (normalizeStr(cur?.content) !== normalizeStr(next?.content)) {
            return true;
          }
          if (Boolean(cur?.isCorrect) !== Boolean(next?.isCorrect)) {
            return true;
          }
          if (normalizeStr(cur?.mediaUrl) !== normalizeStr(next?.mediaUrl)) {
            return true;
          }
          if (
            next?.sortOrder !== undefined &&
            cur?.sortOrder !== next?.sortOrder
          ) {
            return true;
          }
        }
        break;
      }

      case "fill_blank": {
        if (
          newIsCaseSensitive !== undefined &&
          Boolean(currentVersion.isCaseSensitive) !==
            Boolean(newIsCaseSensitive)
        ) {
          return true;
        }

        const currentAnswers: string[] = currentVersion.acceptedAnswers || [];
        const nextAnswers: string[] = newAcceptedAnswers || [];

        if (currentAnswers.length !== nextAnswers.length) {
          return true;
        }

        for (let i = 0; i < nextAnswers.length; i++) {
          if (
            normalizeStr(currentAnswers[i]) !== normalizeStr(nextAnswers[i])
          ) {
            return true;
          }
        }
        break;
      }

      case "matching": {
        const currentPairs: IMatchingPair[] = currentVersion.pairs || [];
        const nextPairs: IMatchingPair[] = newPairs || [];

        if (currentPairs.length !== nextPairs.length) {
          return true;
        }

        for (let i = 0; i < nextPairs.length; i++) {
          const cur = currentPairs[i];
          const next = nextPairs[i];

          if (
            normalizeStr(cur?.left) !== normalizeStr(next?.left) ||
            normalizeStr(cur?.right) !== normalizeStr(next?.right)
          ) {
            return true;
          }
        }
        break;
      }

      case "ordering": {
        const currentItems: IOrderingItem[] =
          currentVersion.orderingItems || [];
        const nextItems: IOrderingItem[] = newOrderingItems || [];

        if (currentItems.length !== nextItems.length) {
          return true;
        }

        for (let i = 0; i < nextItems.length; i++) {
          const cur = currentItems[i];
          const next = nextItems[i];

          if (normalizeStr(cur?.text) !== normalizeStr(next?.text)) {
            return true;
          }
          if (cur?.correctOrder !== next?.correctOrder) {
            return true;
          }
        }
        break;
      }

      default:
        break;
    }

    return false;
  }

  /**
   * Check if Question model fields (difficulty, passageId) have changed
   */
  hasQuestionMetadataChanged(payload: {
    currentDifficulty: string;
    newDifficulty?: string;
    currentPassageId?: any;
    targetPassageId?: any;
    isPassageProvided: boolean;
  }): boolean {
    const isDifficultyChanged =
      payload.newDifficulty !== undefined &&
      payload.newDifficulty !== payload.currentDifficulty;

    const curPassageStr = payload.currentPassageId
      ? payload.currentPassageId.toString()
      : null;
    const targetPassageStr = payload.targetPassageId
      ? payload.targetPassageId.toString()
      : null;
    const isPassageChanged =
      payload.isPassageProvided && curPassageStr !== targetPassageStr;

    return isDifficultyChanged || isPassageChanged;
  }
}

export const questionUtils = new QuestionUtils();
