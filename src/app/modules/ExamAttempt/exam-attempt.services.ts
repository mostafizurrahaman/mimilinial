import httpStatus from "http-status";
import { Types } from "mongoose";
import type { PipelineStage } from "mongoose";
import {
  AppError,
  BadRequest,
  ConflictError,
  NotFoundError,
} from "../../errors";
import { ExamAttempt } from "./exam-attempt.model";
import { ExamResult, formatDisplayTime } from "../ExamResult";
import { userMasteryServices } from "../UserMastery";
import { Exam } from "../Exam/exam.model";
import { EXAM_STATUS, EXAM_TYPE } from "../Exam/exam.constants";
import { QuestionMapping } from "../QuestionMapping";
import { QuestionVersion } from "../QuestionVersion";
import { Question, QUESTION_STATUS } from "../Questions";
import {
  ExamAttemptStatus,
  examAttemptSortableFields,
  type TExamAttemptStatus,
} from "./exam-attempt.constants";
import { ExamAttemptUtils, examAttemptUtils } from "./exam-attempt.utils";
import type {
  TStartSelfPracticeExamPayloadType,
  TSyncAnswerPayloadType,
  TGetAllExamAttemptQueryParamsType,
} from "./exam-attempt.validations";
import { formatQuery } from "../../utils";
import type { IExamAttemptDoc } from "./exam-attempt.interfaces";
import { Category, categoryStatus } from "../Category";
import { getArticle } from "@/app/utils/get-article";
import { Subject, SUBJECT_STATUS } from "../Subject";
import { Topic, TOPIC_STATUS, type ITopicDoc } from "../Topic";

export interface IClientAuditMeta {
  ipAddress?: string | null;
  userAgent?: string | null;
}

/**
 * -------------------------------------------------------------------------
 * HELPER: Grade and Finalize Attempt (Internal Engine)
 * Used by manual submit, auto-timeout on resume, and background cron worker.
 * -------------------------------------------------------------------------
 */
const gradeAndFinalizeAttempt = async (
  attempt: IExamAttemptDoc,
  finalStatus: TExamAttemptStatus,
  timeTakenSeconds?: number,
) => {
  const now = new Date();

  // If timeTakenSeconds not provided, calculate it capped to max exam duration
  if (timeTakenSeconds === undefined) {
    let maxDurationSeconds = 120 * 60; // default 2 hours
    if (!attempt.isSelfPractice && attempt.examId) {
      const exam = await Exam.findById(attempt.examId);
      if (exam) maxDurationSeconds = exam.durationMins * 60;
    } else if (attempt.selfPracticeConfig?.durationMins) {
      maxDurationSeconds = attempt.selfPracticeConfig.durationMins * 60;
    }

    const rawTimeTaken = Math.max(
      0,
      Math.round(
        (now.getTime() - new Date(attempt.startDate).getTime()) / 1000,
      ),
    );
    timeTakenSeconds = Math.min(rawTimeTaken, maxDurationSeconds);
  }

  // Update attempt status
  attempt.status = finalStatus;
  attempt.submittedAt = now;
  attempt.totalTimeTakenSeconds = timeTakenSeconds;
  await attempt.save();

  // Check if ExamResult already exists
  const existingResult = await ExamResult.findOne({ attemptId: attempt._id });
  if (existingResult) {
    return existingResult;
  }

  // Load versions and mappings for grading
  const versionIds = attempt.questions
    .map((q) => q.versionId)
    .filter((id): id is Types.ObjectId => Boolean(id));
  const mappingIds = attempt.questions.map((q) => q.mappingId);

  const [versions, mappings] = await Promise.all([
    QuestionVersion.find({ _id: { $in: versionIds } }),
    QuestionMapping.find({ _id: { $in: mappingIds } }).populate("subject"),
  ]);

  const versionsMap = new Map<string, any>();
  for (const v of versions) {
    versionsMap.set((v as any)._id.toString(), v);
  }

  const mappingsMap = new Map<string, any>();
  for (const m of mappings) {
    mappingsMap.set(m._id.toString(), m);
  }

  // Determine scoring rules
  let marksPerQuestion = 1;
  let negativeMarks = 0.25;
  let passMarks = 0;

  if (!attempt.isSelfPractice && attempt.examId) {
    const exam = await Exam.findById(attempt.examId);
    if (exam) {
      marksPerQuestion = exam.marksPerQuestion;
      negativeMarks = exam.negativeMarks;
      passMarks = exam.passMarks;
    }
  }

  // Calculate Scorecard
  const scorecard = ExamAttemptUtils.calculateScorecard(
    attempt.questions,
    versionsMap,
    mappingsMap,
    {
      marksPerQuestion,
      negativeMarks,
      passMarks,
    },
  );

  const timeTakenMinutes =
    Math.round((timeTakenSeconds / 60) * 100) / 100;
  const displayTotalTimeTaken = formatDisplayTime(timeTakenSeconds);

  // Create immutable ExamResult
  const examResult = await ExamResult.create({
    attemptId: attempt._id,
    examId: attempt.examId || null,
    user: attempt.user,
    isSelfPractice: attempt.isSelfPractice,
    ...scorecard,
    totalTimeTakenSeconds: timeTakenSeconds,
    totalTimeTakenMinutes: timeTakenMinutes,
    displayTotalTimeTaken,
  });

  // Background sync: update user mastery statistics
  userMasteryServices
    .updateMasteryFromExamAttempt(attempt, versionsMap, mappingsMap)
    .catch((err) => console.error("Error updating user mastery:", err));

  return examResult;
};

// 1. START OFFICIAL EXAM
const startOfficialExam = async (
  userId: string,
  examId: string,
  clientMeta?: IClientAuditMeta,
) => {
  const exam = await Exam.findById(examId);
  if (!exam) {
    throw new NotFoundError("Exam not found.");
  }

  if (exam.status !== EXAM_STATUS.PUBLISHED) {
    throw new BadRequest("This exam is not currently published.");
  }

  const now = new Date();

  // Edge Case 1: Live exam timing window & Retake Prevention
  if (exam.examType === EXAM_TYPE.LIVE) {
    if (exam.startTime && now < new Date(exam.startTime)) {
      throw new BadRequest(
        `This live exam has not started yet. It will open at ${new Date(exam.startTime).toLocaleString()}.`,
      );
    }
    if (exam.endTime && now > new Date(exam.endTime)) {
      throw new BadRequest("The window for this live exam has closed.");
    }

    // Check if student has already completed a live attempt (Retake Prevention)
    const completedAttempt = await ExamAttempt.findOne({
      user: new Types.ObjectId(userId),
      examId: exam._id,
      status: {
        $in: [ExamAttemptStatus.SUBMITTED, ExamAttemptStatus.TIME_OUT],
      },
    });

    if (completedAttempt) {
      throw new ConflictError(
        "You have already participated in this live exam. Retakes are not allowed during the live competition.",
      );
    }
  }

  // Edge Case: Existing in-progress session
  const activeAttempt = await ExamAttempt.findOne({
    user: new Types.ObjectId(userId),
    examId: exam._id,
    status: ExamAttemptStatus.IN_PROGRESS,
  });

  if (activeAttempt) {
    if (!ExamAttemptUtils.isAttemptExpired(activeAttempt.expiresAt)) {
      // Resume existing active attempt
      return {
        isResumed: true,
        attemptId: activeAttempt._id,
        startedAt: activeAttempt.startDate,
        expiresAt: activeAttempt.expiresAt,
        status: activeAttempt.status,
      };
    } else {
      // Auto-expire and grade old zombie session
      await gradeAndFinalizeAttempt(activeAttempt, ExamAttemptStatus.TIME_OUT);

      if (exam.examType === EXAM_TYPE.LIVE) {
        throw new ConflictError(
          "Your exam time has expired and your attempt has been finalized. Retakes are not allowed during the live competition.",
        );
      }
    }
  }

  // Calculate strict expiry (capped to live exam endTime if applicable)
  const startedAt = new Date();
  const expiresAt = ExamAttemptUtils.calculateExpiresAt(
    startedAt,
    exam.durationMins,
    exam.endTime,
  );

  // Fetch question mappings
  const mappings = await QuestionMapping.find({
    _id: { $in: exam.questionMappings },
  });

  if (!mappings || mappings.length === 0) {
    throw new BadRequest("Exam has no configured questions.");
  }

  const questionIds = mappings.map((m) => m.question);

  // Fetch active question versions and passage details (Edge Case 5: Passage Comprehension)
  const [versions, questionsWithPassages] = await Promise.all([
    QuestionVersion.find({
      question: { $in: questionIds },
      isCurrent: true,
    }),
    Question.find({ _id: { $in: questionIds } }).populate("passageId"),
  ]);

  const versionMap = new Map<string, any>();
  for (const v of versions) {
    versionMap.set(v.question.toString(), v);
  }

  const passageMap = new Map<string, any>();
  for (const q of questionsWithPassages) {
    if (q.passageId && typeof q.passageId === "object") {
      const p = q.passageId as any;
      passageMap.set(q._id.toString(), {
        _id: p._id,
        titleBn: p.titleBn,
        titleEn: p.titleEn,
        bodyBn: p.bodyBn,
        bodyEn: p.bodyEn,
        mediaUrl: p.mediaUrl,
      });
    }
  }

  // Order & randomize questions if configured
  let chosenMappings = [...mappings];
  if (exam.isRandomized) {
    chosenMappings = ExamAttemptUtils.shuffleArray(chosenMappings);
  }

  const questionsPayload = chosenMappings.map((m) => {
    const version = versionMap.get(m.question.toString());
    return {
      mappingId: m._id,
      questionId: m.question,
      versionId: version?._id || null,
      questionType: version?.type || "single_mcq",
      userAnswer: null,
      isAnswered: false,
      isMarkedForReview: false,
      timeSpentSeconds: 0,
    };
  });

  const previousAttemptsCount = await ExamAttempt.countDocuments({
    user: new Types.ObjectId(userId),
    examId: exam._id,
  });

  // Edge Case 2: Save IP and UserAgent in attempt audit
  const newAttempt = await ExamAttempt.create({
    user: new Types.ObjectId(userId),
    isSelfPractice: false,
    examId: exam._id,
    attemptNumber: previousAttemptsCount + 1,
    status: ExamAttemptStatus.IN_PROGRESS,
    startDate: startedAt,
    expiresAt,
    questions: questionsPayload,
    ipAddress: clientMeta?.ipAddress || null,
    userAgent: clientMeta?.userAgent || null,
  });

  // Prepare sanitized questions for student UI (no isCorrect, no explanations)
  const sanitizedQuestions = chosenMappings.map((m) => {
    const version = versionMap.get(m.question.toString());
    const passage = passageMap.get(m.question.toString()) || null;
    return {
      mappingId: m._id,
      questionId: m.question,
      questionType: version?.type || "single_mcq",
      passage,
      details: version
        ? ExamAttemptUtils.sanitizeQuestionForStudent(
            version,
            exam.isOptionShuffled,
          )
        : null,
    };
  });

  return {
    isResumed: false,
    attemptId: newAttempt._id,
    examId: exam._id,
    title: exam.title,
    durationMins: exam.durationMins,
    totalQuestions: exam.totalQuestions,
    startedAt,
    expiresAt,
    questions: sanitizedQuestions,
  };
};

// 2. START SELF PRACTICE EXAM
const startSelfPracticeExam = async (
  userId: string,
  payload: TStartSelfPracticeExamPayloadType,
  clientMeta?: IClientAuditMeta,
) => {
  const { category, subject, topics, totalQuestions, durationMins } = payload;

  const matchFilter: Record<string, any> = {};

  // Category Validation:
  let existingCategory = null;
  if (category) {
    existingCategory = await Category.findById(category);
    if (!existingCategory) {
      throw new NotFoundError("Category not found.");
    }

    if (existingCategory.status !== categoryStatus.PUBLISHED) {
      throw new BadRequest(
        `You can not practice under ${getArticle(existingCategory.status)} category.`,
      );
    }

    matchFilter.category = existingCategory._id;
  }

  // Subject Validation:
  let existingSubject = null;
  if (subject) {
    existingSubject = await Subject.findById(subject);
    if (!existingSubject) {
      throw new NotFoundError("Subject not found.");
    }

    if (existingSubject.status !== SUBJECT_STATUS.PUBLISHED) {
      throw new BadRequest(
        `You can not practice under ${getArticle(existingSubject.status)} subject.`,
      );
    }

    matchFilter.subject = existingSubject._id;
  }

  // Topics Validation:
  let existingTopics: ITopicDoc[] = [];
  if (topics && Array.isArray(topics) && topics.length > 0) {
    const uniqueTopicIds = Array.from(new Set(topics.map((t) => t.toString())));

    const targetedTopics = await Topic.find({
      _id: { $in: uniqueTopicIds },
    });

    if (targetedTopics.length === 0) {
      throw new NotFoundError("No topics found.");
    }

    if (targetedTopics.length !== uniqueTopicIds.length) {
      throw new BadRequest("Some of the selected topics do not exist.");
    }

    const unpublishedTopic = targetedTopics.find(
      (t) => t.status !== TOPIC_STATUS.PUBLISHED,
    );

    if (unpublishedTopic) {
      throw new BadRequest(
        `Topic "${unpublishedTopic.nameEn}" is not published yet.`,
      );
    }

    // Check if all topics belong to provided subject:
    if (existingSubject) {
      const isAllBelongToSubject = targetedTopics.every(
        (t) => t.subject.toString() === existingSubject._id.toString(),
      );

      if (!isAllBelongToSubject) {
        throw new BadRequest("All topics must belong to the selected subject.");
      }
    }

    existingTopics = targetedTopics;
    matchFilter.topic = { $in: existingTopics.map((t) => t._id) };
  }

  // Aggregate random questions
  const samplePipeline: PipelineStage[] = [
    { $match: matchFilter },
    {
      $lookup: {
        from: "questions",
        localField: "question",
        foreignField: "_id",
        as: "qDoc",
      },
    },
    { $unwind: "$qDoc" },
    { $match: { "qDoc.status": QUESTION_STATUS.PUBLISHED } },
    {
      $group: {
        _id: "$question",
        mappingId: { $first: "$_id" },
      },
    },
    { $sample: { size: totalQuestions } },
  ];

  const sampledMappings = await QuestionMapping.aggregate(samplePipeline);

  if (!sampledMappings || sampledMappings.length < totalQuestions) {
    throw new BadRequest(
      `Not enough published questions found for the selected criteria (found ${sampledMappings?.length || 0}, requested ${totalQuestions}).`,
    );
  }

  const questionIds = sampledMappings.map((s) => s._id);

  // Fetch active question versions and passage details (Edge Case 5: Passage Comprehension)
  const [versions, questionsWithPassages] = await Promise.all([
    QuestionVersion.find({
      question: { $in: questionIds },
      isCurrent: true,
    }),
    Question.find({ _id: { $in: questionIds } }).populate("passageId"),
  ]);

  const versionMap = new Map<string, any>();
  for (const v of versions) {
    versionMap.set(v.question.toString(), v);
  }

  const passageMap = new Map<string, any>();
  for (const q of questionsWithPassages) {
    if (q.passageId && typeof q.passageId === "object") {
      const p = q.passageId as any;
      passageMap.set(q._id.toString(), {
        _id: p._id,
        titleBn: p.titleBn,
        titleEn: p.titleEn,
        bodyBn: p.bodyBn,
        bodyEn: p.bodyEn,
        mediaUrl: p.mediaUrl,
      });
    }
  }

  const startedAt = new Date();
  const expiresAt = ExamAttemptUtils.calculateExpiresAt(
    startedAt,
    durationMins,
  );

  const questionsPayload = sampledMappings.map((s) => {
    const version = versionMap.get(s._id.toString());
    return {
      mappingId: s.mappingId,
      questionId: s._id,
      versionId: version?._id || null,
      questionType: version?.type || "single_mcq",
      userAnswer: null,
      isAnswered: false,
      isMarkedForReview: false,
      timeSpentSeconds: 0,
    };
  });

  // Edge Case 2: Save IP and UserAgent in attempt audit
  const newAttempt = await ExamAttempt.create({
    user: new Types.ObjectId(userId),
    isSelfPractice: true,
    attemptNumber: 1,
    selfPracticeConfig: {
      category: category ? new Types.ObjectId(category) : null,
      subject: subject ? new Types.ObjectId(subject) : null,
      topics: topics?.map((t) => new Types.ObjectId(t)) || [],
      totalQuestions,
      durationMins,
    },
    status: ExamAttemptStatus.IN_PROGRESS,
    startDate: startedAt,
    expiresAt,
    questions: questionsPayload,
    ipAddress: clientMeta?.ipAddress || null,
    userAgent: clientMeta?.userAgent || null,
  });

  const sanitizedQuestions = sampledMappings.map((s) => {
    const version = versionMap.get(s._id.toString());
    const passage = passageMap.get(s._id.toString()) || null;
    return {
      mappingId: s.mappingId,
      questionId: s._id,
      questionType: version?.type || "single_mcq",
      passage,
      details: version
        ? ExamAttemptUtils.sanitizeQuestionForStudent(version, true)
        : null,
    };
  });

  return {
    attemptId: newAttempt._id,
    isSelfPractice: true,
    durationMins,
    totalQuestions,
    startedAt,
    expiresAt,
    questions: sanitizedQuestions,
  };
};

// 3. RESUME ACTIVE ATTEMPT
const resumeActiveAttempt = async (userId: string, attemptId: string) => {
  const attempt = await ExamAttempt.findOne({
    _id: attemptId,
    user: new Types.ObjectId(userId),
  });

  if (!attempt) {
    throw new NotFoundError("Exam attempt not found.");
  }

  if (attempt.status !== ExamAttemptStatus.IN_PROGRESS) {
    return {
      isExpired: true,
      status: attempt.status,
      message: `This attempt is already ${attempt.status}.`,
    };
  }

  // Edge Case 3: Check if expired, auto-grade and finalize
  if (ExamAttemptUtils.isAttemptExpired(attempt.expiresAt)) {
    const result = await gradeAndFinalizeAttempt(
      attempt,
      ExamAttemptStatus.TIME_OUT,
    );
    return {
      isExpired: true,
      status: ExamAttemptStatus.TIME_OUT,
      message: "Exam duration has expired. The exam has been graded.",
      result,
    };
  }

  // Load versions and passages for student UI
  const versionIds = attempt.questions
    .map((q) => q.versionId)
    .filter((id): id is Types.ObjectId => Boolean(id));

  const questionIds = attempt.questions.map((q) => q.questionId);

  const [versions, questionsWithPassages] = await Promise.all([
    QuestionVersion.find({ _id: { $in: versionIds } }),
    Question.find({ _id: { $in: questionIds } }).populate("passageId"),
  ]);

  const versionMap = new Map<string, any>();
  for (const v of versions) {
    versionMap.set((v as any)._id.toString(), v);
  }

  const passageMap = new Map<string, any>();
  for (const q of questionsWithPassages) {
    if (q.passageId && typeof q.passageId === "object") {
      const p = q.passageId as any;
      passageMap.set(q._id.toString(), {
        _id: p._id,
        titleBn: p.titleBn,
        titleEn: p.titleEn,
        bodyBn: p.bodyBn,
        bodyEn: p.bodyEn,
        mediaUrl: p.mediaUrl,
      });
    }
  }

  const sanitizedQuestions = attempt.questions.map((q) => {
    const v = q.versionId ? versionMap.get(q.versionId.toString()) : null;
    const passage = passageMap.get(q.questionId.toString()) || null;
    return {
      mappingId: q.mappingId,
      questionId: q.questionId,
      questionType: q.questionType,
      passage,
      userAnswer: q.userAnswer,
      isAnswered: q.isAnswered,
      isMarkedForReview: q.isMarkedForReview,
      timeSpentSeconds: q.timeSpentSeconds,
      details: v ? ExamAttemptUtils.sanitizeQuestionForStudent(v, false) : null,
    };
  });

  return {
    attemptId: attempt._id,
    isSelfPractice: attempt.isSelfPractice,
    status: attempt.status,
    startDate: attempt.startDate,
    expiresAt: attempt.expiresAt,
    tabSwitchedCount: attempt.tabSwitchedCount,
    questions: sanitizedQuestions,
  };
};

// 4. SYNC ANSWER
const syncAnswer = async (
  userId: string,
  attemptId: string,
  payload: TSyncAnswerPayloadType,
) => {
  const attempt = await ExamAttempt.findOne({
    _id: attemptId,
    user: new Types.ObjectId(userId),
  });

  if (!attempt) {
    throw new NotFoundError("Exam attempt not found.");
  }

  if (attempt.status !== ExamAttemptStatus.IN_PROGRESS) {
    throw new BadRequest(`Cannot submit answer. Exam is ${attempt.status}.`);
  }

  // Server-authoritative expiration check
  if (ExamAttemptUtils.isAttemptExpired(attempt.expiresAt)) {
    await gradeAndFinalizeAttempt(attempt, ExamAttemptStatus.TIME_OUT);
    throw new BadRequest("Exam time has expired.");
  }

  const targetIndex = attempt.questions.findIndex(
    (q) => q.mappingId.toString() === payload.mappingId.toString(),
  );

  if (targetIndex === -1) {
    throw new BadRequest("Question does not belong to this exam attempt.");
  }

  // Update specific question answer state
  const target = attempt.questions[targetIndex]!;
  target.userAnswer = payload.userAnswer ?? null;
  target.isAnswered =
    payload.userAnswer !== null && payload.userAnswer !== undefined;
  target.isMarkedForReview = Boolean(payload.isMarkedForReview);
  if (payload.timeSpentSeconds) {
    target.timeSpentSeconds =
      (target.timeSpentSeconds || 0) + payload.timeSpentSeconds;
  }

  await attempt.save();

  return {
    mappingId: target.mappingId,
    isAnswered: target.isAnswered,
    isMarkedForReview: target.isMarkedForReview,
  };
};

// 5. LOG TAB SWITCH
const logTabSwitch = async (userId: string, attemptId: string) => {
  const attempt = await ExamAttempt.findOne({
    _id: attemptId,
    user: new Types.ObjectId(userId),
  });

  if (!attempt) {
    throw new NotFoundError("Exam attempt not found.");
  }
  if (attempt.status !== ExamAttemptStatus.IN_PROGRESS) {
    throw new BadRequest(
      `Cannot log tab switch. Exam is already ${attempt.status}.`,
    );
  }

  if (ExamAttemptUtils.isAttemptExpired(attempt.expiresAt)) {
    throw new BadRequest("Exam time has expired.");
  }

  attempt.tabSwitchedCount = (attempt.tabSwitchedCount || 0) + 1;
  await attempt.save();
  return { tabSwitchedCount: attempt.tabSwitchedCount };
};

// 6. SUBMIT EXAM & GENERATE RESULT
const submitExam = async (userId: string, attemptId: string) => {
  const now = new Date();

  // Find the attempt first
  const attempt = await ExamAttempt.findOne({
    _id: attemptId,
    user: new Types.ObjectId(userId),
  });

  if (!attempt) {
    throw new NotFoundError("Exam attempt not found.");
  }

  if (attempt.status !== ExamAttemptStatus.IN_PROGRESS) {
    // If already submitted/timed out, return existing result
    const existingResult = await ExamResult.findOne({ attemptId });
    if (existingResult) {
      return existingResult;
    }
    throw new BadRequest(`Attempt is already ${attempt.status}.`);
  }

  // Edge Case 4: Check if submitted after expiration + grace period
  const isLate = ExamAttemptUtils.isAttemptExpired(attempt.expiresAt, 15);
  const finalStatus = isLate
    ? ExamAttemptStatus.TIME_OUT
    : ExamAttemptStatus.SUBMITTED;

  // Calculate duration capped to exam's configured maximum duration
  let maxDurationSeconds = 120 * 60;
  if (!attempt.isSelfPractice && attempt.examId) {
    const exam = await Exam.findById(attempt.examId);
    if (exam) maxDurationSeconds = exam.durationMins * 60;
  } else if (attempt.selfPracticeConfig?.durationMins) {
    maxDurationSeconds = attempt.selfPracticeConfig.durationMins * 60;
  }

  const rawTimeTaken = Math.max(
    0,
    Math.round((now.getTime() - new Date(attempt.startDate).getTime()) / 1000),
  );
  const timeTakenSeconds = Math.min(rawTimeTaken, maxDurationSeconds);

  // Grade and create result
  const result = await gradeAndFinalizeAttempt(
    attempt,
    finalStatus,
    timeTakenSeconds,
  );
  return result;
};

// 7. REVIEW ANSWER SCRIPT
const reviewAnswerScript = async (
  userId: string,
  attemptId: string,
  isAdmin: boolean = false,
) => {
  const attempt = await ExamAttempt.findById(attemptId);
  if (!attempt) {
    throw new NotFoundError("Exam attempt not found.");
  }

  if (!isAdmin && attempt.user.toString() !== userId) {
    throw new AppError(httpStatus.FORBIDDEN, "Access denied to this attempt.");
  }

  // Edge case: Live exam leak prevention
  if (!isAdmin && !attempt.isSelfPractice && attempt.examId) {
    const exam = await Exam.findById(attempt.examId);
    if (
      exam?.examType === EXAM_TYPE.LIVE &&
      exam.endTime &&
      new Date() < new Date(exam.endTime)
    ) {
      throw new BadRequest(
        `Solutions cannot be viewed until the live exam window ends at ${new Date(exam.endTime).toLocaleString()}.`,
      );
    }
  }

  const versionIds = attempt.questions
    .map((q) => q.versionId)
    .filter((id): id is Types.ObjectId => Boolean(id));

  const questionIds = attempt.questions.map((q) => q.questionId);

  const [result, versions, questionsWithPassages] = await Promise.all([
    ExamResult.findOne({ attemptId: attempt._id }),
    QuestionVersion.find({ _id: { $in: versionIds } }),
    Question.find({ _id: { $in: questionIds } }).populate("passageId"),
  ]);

  const versionsMap = new Map<string, any>();
  for (const v of versions) {
    versionsMap.set((v as any)._id.toString(), v);
  }

  const passageMap = new Map<string, any>();
  for (const q of questionsWithPassages) {
    if (q.passageId && typeof q.passageId === "object") {
      const p = q.passageId as any;
      passageMap.set(q._id.toString(), {
        _id: p._id,
        titleBn: p.titleBn,
        titleEn: p.titleEn,
        bodyBn: p.bodyBn,
        bodyEn: p.bodyEn,
        mediaUrl: p.mediaUrl,
      });
    }
  }

  const detailedQuestions = attempt.questions.map((q) => {
    const v = q.versionId ? versionsMap.get(q.versionId.toString()) : null;
    const passage = passageMap.get(q.questionId.toString()) || null;
    const evalResult = v
      ? ExamAttemptUtils.evaluateAnswer(q.questionType as any, v, q.userAnswer)
      : { isAnswered: false, isCorrect: false };

    return {
      mappingId: q.mappingId,
      questionId: q.questionId,
      questionType: q.questionType,
      passage,
      userAnswer: q.userAnswer,
      isAnswered: q.isAnswered,
      isCorrect: evalResult.isCorrect,
      timeSpentSeconds: q.timeSpentSeconds,
      version: v || null,
    };
  });

  return {
    attemptId: attempt._id,
    examId: attempt.examId,
    status: attempt.status,
    startDate: attempt.startDate,
    submittedAt: attempt.submittedAt,
    totalTimeTakenSeconds: attempt.totalTimeTakenSeconds,
    tabSwitchedCount: attempt.tabSwitchedCount,
    result: result || null,
    questions: detailedQuestions,
  };
};

// 8. GET MY ATTEMPTS
const getMyAttempts = async (
  userId: string,
  query: TGetAllExamAttemptQueryParamsType,
) => {
  const { page, limit, skip, searchTerm, sortOrder, sortBy, fromDate, toDate } =
    formatQuery(query, examAttemptSortableFields);

  const filter: Record<string, any> = {
    user: new Types.ObjectId(userId),
  };

  if (query.status) filter.status = query.status;
  if (query.examId) filter.examId = new Types.ObjectId(query.examId);
  if (typeof query.isSelfPractice === "boolean") {
    filter.isSelfPractice = query.isSelfPractice;
  }
  if (fromDate || toDate) {
    filter.createdAt = {};
    if (fromDate) filter.createdAt.$gte = new Date(fromDate);
    if (toDate) filter.createdAt.$lte = new Date(toDate);
  }

  const attempts = await ExamAttempt.find(filter)
    .populate("examId", "title slug totalMarks durationMins")
    .sort({ [sortBy]: sortOrder })
    .skip(skip)
    .limit(limit);

  const total = await ExamAttempt.countDocuments(filter);

  return {
    meta: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit) || 1,
    },
    data: attempts,
  };
};

// 9. GET ALL EXAM ATTEMPTS (Admin)
const getAllExamAttempt = async (query: TGetAllExamAttemptQueryParamsType) => {
  const { page, limit, skip, searchTerm, sortOrder, sortBy, fromDate, toDate } =
    formatQuery(query, examAttemptSortableFields);

  const filter: Record<string, any> = {};

  if (query.status) filter.status = query.status;
  if (query.examId) filter.examId = new Types.ObjectId(query.examId);
  if (query.userId) filter.user = new Types.ObjectId(query.userId);
  if (typeof query.isSelfPractice === "boolean") {
    filter.isSelfPractice = query.isSelfPractice;
  }
  if (fromDate || toDate) {
    filter.createdAt = {};
    if (fromDate) filter.createdAt.$gte = new Date(fromDate);
    if (toDate) filter.createdAt.$lte = new Date(toDate);
  }

  const attempts = await ExamAttempt.find(filter)
    .populate("user", "name email")
    .populate("examId", "title slug")
    .sort({ [sortBy]: sortOrder })
    .skip(skip)
    .limit(limit);

  const total = await ExamAttempt.countDocuments(filter);

  return {
    meta: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit) || 1,
    },
    data: attempts,
  };
};

// 10. CANCEL ATTEMPT (Admin)
const cancelAttempt = async (attemptId: string, reason: string) => {
  const attempt = await ExamAttempt.findById(attemptId);
  if (!attempt) {
    throw new NotFoundError("Exam attempt not found.");
  }

  attempt.status = ExamAttemptStatus.CANCELLED;
  await attempt.save();

  return {
    attemptId: attempt._id,
    status: attempt.status,
    reason,
  };
};

// 11. BACKGROUND CRON WORKER: Auto-grade all expired zombie attempts
const autoGradeAllExpiredAttempts = async (): Promise<number> => {
  const expiredAttempts = await ExamAttempt.find({
    status: ExamAttemptStatus.IN_PROGRESS,
    expiresAt: { $lt: new Date() },
  });

  let processedCount = 0;
  for (const attempt of expiredAttempts) {
    try {
      await gradeAndFinalizeAttempt(attempt, ExamAttemptStatus.TIME_OUT);
      processedCount++;
    } catch (err) {
      console.error(
        `Failed to auto-grade expired attempt: ${attempt._id}`,
        err,
      );
    }
  }

  return processedCount;
};

export const examAttemptServices = {
  startOfficialExam,
  startSelfPracticeExam,
  resumeActiveAttempt,
  syncAnswer,
  logTabSwitch,
  submitExam,
  reviewAnswerScript,
  getMyAttempts,
  getAllExamAttempt,
  cancelAttempt,
  autoGradeAllExpiredAttempts,
};
