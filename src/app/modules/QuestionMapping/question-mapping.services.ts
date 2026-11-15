import httpStatus from "http-status";
import type { PipelineStage } from "mongoose";
import type {
  TCreateQuestionMappingPayloadType,
  TUpdateQuestionMappingPayloadType,
  TGetAllQuestionMappingQueryParamsType,
} from "./question-mapping.validations";
import {
  AppError,
  BadRequest,
  ConflictError,
  NotFoundError,
} from "../../errors";
import { QuestionMapping } from "./question-mapping.model";
import {
  questionMappingSearchableFields,
  questionMappingSortableFields,
} from "./question-mapping.constants";
import type { IUserDoc } from "../User";
import { Question, QUESTION_STATUS } from "../Questions";
import { Collection, COLLECTION_STATUS } from "../Collection";
import { Category, categoryStatus } from "../Category";
import { Subject, SUBJECT_STATUS } from "../Subject";
import { Topic, TOPIC_STATUS } from "../Topic";
import { Track, trackStatus } from "../Track";
import { EXAM_STATUS, PastExam } from "../PastExam";
import { QuestionVersion } from "../QuestionVersion";
import mongoose from "mongoose";
import { formatQuery } from "@/app/utils";

// 1. CREATE QUESTION MAPPING
const createQuestionMapping = async (
  user: IUserDoc,
  payload: TCreateQuestionMappingPayloadType,
) => {
  // Question mapping Docs:
  const {
    question,
    coll,
    category,
    track,
    subject,
    topic,
    pastExam,
    year,
    marks,
    sortOrder,
  } = payload;

  const [
    existingQuestion,
    questionVersion,
    existingCollection,
    existingCategory,
    existingSubject,
    existingTopic,
  ] = await Promise.all([
    Question.findById(question),
    QuestionVersion.findOne({
      question,
      isCurrent: true,
    }),
    Collection.findById(coll),
    Category.findById(category),
    Subject.findById(subject),
    Topic.findById(topic),
  ]);

  // Question related validation:
  if (!existingQuestion) {
    throw new NotFoundError("Question not found.");
  }

  if (existingQuestion.status !== QUESTION_STATUS.PUBLISHED) {
    throw new BadRequest(
      `You can not map an unpublished question. Current status "${existingQuestion.status}"`,
    );
  }

  //  Question Version:

  if (!questionVersion) {
    throw new NotFoundError("There is no current version of the question.");
  }

  // Collection related validation:
  if (!existingCollection) {
    throw new NotFoundError("Collection not found.");
  }

  if (existingCollection.status !== COLLECTION_STATUS.PUBLISHED) {
    throw new BadRequest(
      `You can not map ${existingCollection.status} collection.`,
    );
  }

  // Category Collection
  if (!existingCategory) {
    throw new NotFoundError("Category not found.");
  }

  if (existingCategory.status !== categoryStatus.PUBLISHED) {
    throw new BadRequest(
      `You can not map an unpublish category. Current status  "${existingCategory.status}"`,
    );
  }

  if (
    existingCategory.collectionId?.toString() !==
    existingCollection?._id?.toString()
  ) {
    throw new BadRequest(
      `The selected category does not belong to selected collection.`,
    );
  }

  // Checking tracks:
  let existingTrack = null;
  if (track) {
    existingTrack = await Track.findById(track);
    if (!existingTrack) {
      throw new NotFoundError("Track not found.");
    }

    if (existingTrack.status !== trackStatus.PUBLISHED) {
      throw new BadRequest(
        `You can not map an unpublished track. Current status  "${existingTrack?.status}"`,
      );
    }

    if (
      existingTrack.category?.toString() !==
      existingCategory?._id?.toString()
    ) {
      throw new BadRequest(
        `The selected track does not belong to the selected category.`,
      );
    }
  }

  // Passage ID:
  let existingPastExam = null;
  let correctedYear = year || null;
  if (pastExam) {
    existingPastExam = await PastExam.findById(pastExam);

    if (!existingPastExam) {
      throw new NotFoundError("Past exam not found.");
    }

    if (existingPastExam.status !== EXAM_STATUS.PUBLISHED) {
      throw new BadRequest(
        `You can not map an unpublished past exam. Current status ${existingPastExam.status} `,
      );
    }

    if (
      existingPastExam.category?.toString() !==
      existingCategory?._id?.toString()
    ) {
      throw new BadRequest(
        "The selected past exam does not belong to the selected  category.",
      );
    }

    //  Match past exam track:
    const pastExamTrackStr = existingPastExam.track
      ? existingPastExam.track.toString()
      : null;

    const selectedTrackStr = existingTrack
      ? existingTrack._id.toString()
      : null;

    if (pastExamTrackStr !== selectedTrackStr) {
      throw new BadRequest(
        "The selected past exam does not belong to the selected  track.",
      );
    }

    //  Question capacity check:
    const totalQuestions = existingPastExam?.totalQuestions || 0;
    const mappedQuestions = existingPastExam?.mappedQuestions ?? 0;

    if (mappedQuestions + 1 > totalQuestions) {
      throw new BadRequest(
        `You can not mapped more than ${totalQuestions} questions.`,
      );
    }

    correctedYear = existingPastExam.year;
  }

  // Subject Validation:
  if (!existingSubject) {
    throw new NotFoundError("Subject not found.");
  }

  if (existingSubject.status !== SUBJECT_STATUS.PUBLISHED) {
    throw new BadRequest(
      `You can not map an unpublished subject. Current status "${existingSubject.status}"`,
    );
  }

  // Subject Validation:
  if (!existingTopic) {
    throw new NotFoundError("Topic not found.");
  }

  if (existingTopic.status !== TOPIC_STATUS.PUBLISHED) {
    throw new BadRequest(
      `You can not map an unpublished topic. Current status "${existingTopic.status}"`,
    );
  }

  if (existingTopic.subject?.toString() !== existingSubject?._id?.toString()) {
    throw new BadRequest(
      `The selected topic does not belong to the selected subject.`,
    );
  }

  //   Check duplicate mapping:
  const isDuplicate = await QuestionMapping.exists({
    question: existingQuestion?._id,
    category: existingCategory?._id,
    track: existingTrack?._id ?? null,
    subject: existingSubject?._id,
    topic: existingTopic?._id,
    pastExam: existingPastExam?._id ?? null,
  });

  if (isDuplicate) {
    throw new ConflictError(
      `This question is already mapped to this topic and examination context.`,
    );
  }

  const mongoSession = await mongoose.startSession();

  try {
    mongoSession.startTransaction();

    const [mappedQuestion] = await QuestionMapping.create(
      [
        {
          question: existingQuestion._id,

          // Classification Hierarchy:
          coll: existingCollection._id,
          category: existingCategory._id,
          track: existingTrack?._id || null,

          // Category:
          subject: existingSubject._id,
          topic: existingTopic._id,

          //  Previous Questions:
          pastExam: existingPastExam?._id || null,
          year: correctedYear,

          //  Marking and Order:
          marks,
          sortOrder,

          //  Author:
          author: user?._id,
        },
      ],
      {
        session: mongoSession,
      },
    );

    if (!mappedQuestion) {
      throw new BadRequest("Failed to mapped question");
    }

    if (mappedQuestion?.pastExam) {
      const updatedExam = await PastExam.findOneAndUpdate(
        {
          _id: mappedQuestion?.pastExam,
          $expr: { $lt: ["$mappedQuestions", "$totalQuestions"] },
        },
        {
          $inc: {
            mappedQuestions: 1,
          },
        },
        {
          session: mongoSession,
          new: true,
        },
      );

      if (!updatedExam) {
        throw new BadRequest(
          `Failed to update mapped count. The exam has already reached its total question limit.`,
        );
      }
    }

    await mongoSession.commitTransaction();

    return mappedQuestion;
  } catch (error) {
    if (mongoSession.inTransaction()) {
      await mongoSession.abortTransaction();
    }

    throw error;
  } finally {
    await mongoSession.endSession();
  }
};

// 2. UPDATE QUESTION MAPPING
const updateQuestionMapping = async (
  user: IUserDoc,
  id: string,
  payload: TUpdateQuestionMappingPayloadType,
) => {
  // 1. Get Mapped Question BY ID
  const existingMapping = await QuestionMapping.findById(id);
  if (!existingMapping) {
    throw new NotFoundError("Question mapping not found.");
  }

  // 1.1 Disallow changing the question of an existing mapping
  if (
    payload.question &&
    payload.question.toString() !== existingMapping.question.toString()
  ) {
    throw new BadRequest(
      "Changing the question of an existing mapping is not allowed. Please create a new mapping instead.",
    );
  }

  // 1.2 Check if any hierarchy/classification field is changed
  const isHierarchyChanged =
    (payload.coll !== undefined &&
      payload.coll.toString() !== existingMapping.coll.toString()) ||
    (payload.category !== undefined &&
      payload.category.toString() !== existingMapping.category.toString()) ||
    (payload.track !== undefined &&
      (payload.track?.toString() ?? null) !==
      (existingMapping.track?.toString() ?? null)) ||
    (payload.subject !== undefined &&
      payload.subject.toString() !== existingMapping.subject.toString()) ||
    (payload.topic !== undefined &&
      payload.topic.toString() !== existingMapping.topic.toString()) ||
    (payload.pastExam !== undefined &&
      (payload.pastExam?.toString() ?? null) !==
      (existingMapping.pastExam?.toString() ?? null));

  // If hierarchy did NOT change, only update non-hierarchy fields (marks, sortOrder, year)
  if (!isHierarchyChanged) {
    let hasFieldChanged = false;

    if (
      payload.marks !== undefined &&
      payload.marks !== existingMapping.marks
    ) {
      existingMapping.marks = payload.marks;
      hasFieldChanged = true;
    }

    if (
      payload.sortOrder !== undefined &&
      payload.sortOrder !== existingMapping.sortOrder
    ) {
      existingMapping.sortOrder = payload.sortOrder;
      hasFieldChanged = true;
    }

    if (payload.year !== undefined && payload.year !== existingMapping.year) {
      if (existingMapping.pastExam) {
        throw new BadRequest(
          "Year cannot be manually changed when a past exam is mapped. It is determined by the past exam.",
        );
      }
      existingMapping.year = payload.year;
      hasFieldChanged = true;
    }

    if (hasFieldChanged) {
      existingMapping.author = user._id;
      await existingMapping.save();
    }

    return existingMapping;
  }

  // 2.  (Effective / Target)
  const targetQuestionId = existingMapping.question;
  const targetCollectionId = payload.coll ?? existingMapping.coll;
  const targetCategoryId = payload.category ?? existingMapping.category;
  const targetTrackId =
    payload.track !== undefined ? payload.track : existingMapping.track;
  const targetSubjectId = payload.subject ?? existingMapping.subject;
  const targetTopicId = payload.topic ?? existingMapping.topic;
  const targetPastExamId =
    payload.pastExam !== undefined
      ? payload.pastExam
      : existingMapping.pastExam;

  // 3. Do Parallel Fetch:
  const [
    effectiveQuestion,
    questionVersion,
    effectiveCollection,
    effectiveCategory,
    effectiveTrack,
    effectiveSubject,
    effectiveTopic,
    effectivePastExam,
  ] = await Promise.all([
    Question.findById(targetQuestionId),
    QuestionVersion.findOne({ question: targetQuestionId, isCurrent: true }),
    Collection.findById(targetCollectionId),
    Category.findById(targetCategoryId),
    targetTrackId ? Track.findById(targetTrackId) : Promise.resolve(null),
    Subject.findById(targetSubjectId),
    Topic.findById(targetTopicId),
    targetPastExamId
      ? PastExam.findById(targetPastExamId)
      : Promise.resolve(null),
  ]);

  // 4. Question validation
  if (!effectiveQuestion) {
    throw new NotFoundError("Question not found.");
  }
  if (effectiveQuestion.status !== QUESTION_STATUS.PUBLISHED) {
    throw new BadRequest(
      `Cannot map an unpublished question. Current status: "${effectiveQuestion.status}".`,
    );
  }
  if (!questionVersion) {
    throw new NotFoundError("There is no active version for this question.");
  }

  // 5. Collection Validation
  if (!effectiveCollection) {
    throw new NotFoundError("Collection not found.");
  }

  if (effectiveCollection.status !== COLLECTION_STATUS.PUBLISHED) {
    throw new BadRequest(
      `Cannot map under an unpublished collection. Current status: "${effectiveCollection.status}".`,
    );
  }

  // 6. Category Validation:
  if (!effectiveCategory) {
    throw new NotFoundError("Category not found.");
  }

  if (effectiveCategory.status !== categoryStatus.PUBLISHED) {
    throw new BadRequest(
      `Cannot map under an unpublished category. Current status: "${effectiveCategory.status}".`,
    );
  }

  if (
    effectiveCategory.collectionId?.toString() !==
    effectiveCollection._id.toString()
  ) {
    throw new BadRequest(
      "The selected category does not belong to the selected collection.",
    );
  }

  // 7. Track Validation:
  if (targetTrackId) {
    if (!effectiveTrack) {
      throw new NotFoundError("Track not found.");
    }
    if (effectiveTrack.status !== trackStatus.PUBLISHED) {
      throw new BadRequest(
        `Cannot map under an unpublished track. Current status: "${effectiveTrack.status}".`,
      );
    }
    if (
      effectiveTrack.category?.toString() !==
      effectiveCategory._id.toString()
    ) {
      throw new BadRequest(
        "The selected track does not belong to the selected category.",
      );
    }
  }

  // 8. Subject Validation
  if (!effectiveSubject) {
    throw new NotFoundError("Subject not found.");
  }
  if (effectiveSubject.status !== SUBJECT_STATUS.PUBLISHED) {
    throw new BadRequest(
      `Cannot map an unpublished subject. Current status: "${effectiveSubject.status}".`,
    );
  }

  // 9. Topic Validation
  if (!effectiveTopic) {
    throw new NotFoundError("Topic not found.");
  }
  if (effectiveTopic.status !== TOPIC_STATUS.PUBLISHED) {
    throw new BadRequest(
      `Cannot map an unpublished topic. Current status: "${effectiveTopic.status}".`,
    );
  }
  if (effectiveTopic.subject?.toString() !== effectiveSubject._id.toString()) {
    throw new BadRequest(
      "The selected topic does not belong to the selected subject.",
    );
  }

  // 10. Past Exam validation and select year.
  let correctedYear =
    payload.year !== undefined ? payload.year : existingMapping.year;

  if (targetPastExamId) {
    if (!effectivePastExam) {
      throw new NotFoundError("Past exam not found.");
    }
    if (effectivePastExam.status !== EXAM_STATUS.PUBLISHED) {
      throw new BadRequest(
        `Cannot map under an unpublished past exam. Current status: "${effectivePastExam.status}".`,
      );
    }
    if (
      effectivePastExam.category?.toString() !==
      effectiveCategory._id.toString()
    ) {
      throw new BadRequest(
        "The selected past exam does not belong to the selected category.",
      );
    }

    // Track null safe-call:
    const pastExamTrackStr = effectivePastExam.track
      ? effectivePastExam.track.toString()
      : null;
    const selectedTrackStr = effectiveTrack
      ? effectiveTrack._id.toString()
      : null;

    if (pastExamTrackStr !== selectedTrackStr) {
      throw new BadRequest(
        "The selected past exam's track does not match the effective track.",
      );
    }

    // PastExam
    correctedYear = effectivePastExam.year;
  }

  // 10. Duplicate map checking:
  const isDuplicate = await QuestionMapping.exists({
    _id: { $ne: id },
    question: effectiveQuestion._id,
    category: effectiveCategory._id,
    track: effectiveTrack?._id ?? null,
    subject: effectiveSubject._id,
    topic: effectiveTopic._id,
    pastExam: effectivePastExam?._id ?? null,
  });

  if (isDuplicate) {
    throw new ConflictError(
      "Another mapping already exists with this exact question, topic, and examination context.",
    );
  }

  // 12. Detect PastExam Change:
  const oldPastExamId = existingMapping.pastExam
    ? existingMapping.pastExam.toString()
    : null;
  const newPastExamId = effectivePastExam
    ? effectivePastExam._id.toString()
    : null;
  const isPastExamChanged = oldPastExamId !== newPastExamId;

  // 13. Database Transaction:
  const mongoSession = await mongoose.startSession();

  try {
    mongoSession.startTransaction();

    // 13.1. If past exam changed,shift  the mapped question count to new past exam
    if (isPastExamChanged && newPastExamId) {
      const incrementedExam = await PastExam.findOneAndUpdate(
        {
          _id: newPastExamId,
          $expr: { $lt: ["$mappedQuestions", "$totalQuestions"] },
        },
        { $inc: { mappedQuestions: 1 } },
        { session: mongoSession, new: true },
      );

      if (!incrementedExam) {
        throw new BadRequest(
          `Cannot map to the new past exam. It has already reached its limit of ${effectivePastExam?.totalQuestions} questions.`,
        );
      }
    }

    // 3. Decrement From Previous Exam:
    if (isPastExamChanged && oldPastExamId) {
      await PastExam.findByIdAndUpdate(
        oldPastExamId,
        { $inc: { mappedQuestions: -1 } },
        { session: mongoSession },
      );
    }

    // 4. Update the question
    const updatedMapping = await QuestionMapping.findByIdAndUpdate(
      id,
      {
        $set: {
          question: effectiveQuestion._id,
          coll: effectiveCollection._id,
          category: effectiveCategory._id,
          track: effectiveTrack?._id || null,
          subject: effectiveSubject._id,
          topic: effectiveTopic._id,
          pastExam: effectivePastExam?._id || null,
          year: correctedYear,
          marks: payload.marks ?? existingMapping.marks,
          sortOrder: payload.sortOrder ?? existingMapping.sortOrder,
          author: user._id,
        },
      },
      { session: mongoSession, new: true, runValidators: true },
    );

    if (!updatedMapping) {
      throw new NotFoundError("Failed to update question mapping.");
    }

    await mongoSession.commitTransaction();
    return updatedMapping;
  } catch (error) {
    if (mongoSession.inTransaction()) {
      await mongoSession.abortTransaction();
    }
    throw error;
  } finally {
    await mongoSession.endSession();
  }
};

// 3. GET ALL QUESTION MAPPING
const getAllQuestionMapping = async (
  query: TGetAllQuestionMappingQueryParamsType,
) => {
  const {
    questionIds,
    collectionIds,
    categoryIds,
    trackIds,
    subjectIds,
    topicIds,
    pastExamIds,
    years,

    // Question
    type,
    difficulty,

    // includeInActiveQuestion
    includeInActiveQuestion,
  } = query;


  console.log(type)

  const {
    page,
    limit,
    skip,
    searchTerm,
    sortOrder,
    sortBy,
    fromDate,
    toDate,
  } = formatQuery(query, questionMappingSortableFields);

  const pipeline: PipelineStage[] = [];

  const matchStage: PipelineStage.Match = {
    $match: {},
  };

  // Collection Filter:
  if (
    collectionIds &&
    Array.isArray(collectionIds) &&
    collectionIds?.length > 0
  ) {
    matchStage.$match["coll"] = {
      $in: collectionIds,
    };
  }

  // Category Filter:
  if (categoryIds && Array.isArray(categoryIds) && categoryIds?.length > 0) {
    matchStage.$match["category"] = {
      $in: categoryIds,
    };
  }

  // track Filter:
  if (trackIds && Array.isArray(trackIds) && trackIds?.length > 0) {
    matchStage.$match["track"] = {
      $in: trackIds,
    };
  }

  // Subject Filter:
  if (subjectIds && Array.isArray(subjectIds) && subjectIds?.length > 0) {
    matchStage.$match["subject"] = {
      $in: subjectIds,
    };
  }

  // Topic Filter:
  if (topicIds && Array.isArray(topicIds) && topicIds?.length > 0) {
    matchStage.$match["topic"] = {
      $in: topicIds,
    };
  }

  // Topic Filter:
  if (pastExamIds && Array.isArray(pastExamIds) && pastExamIds?.length > 0) {
    matchStage.$match["pastExam"] = {
      $in: pastExamIds,
    };
  }

  // Year Filter:
  if (years && Array.isArray(years) && years?.length > 0) {
    matchStage.$match["year"] = {
      $in: years,
    };
  }

  // Question Ids Filter:
  if (questionIds && Array.isArray(questionIds) && questionIds?.length > 0) {
    matchStage.$match["question"] = {
      $in: questionIds,
    };
  }

  if (Object.values(matchStage?.$match)?.length > 0) {
    pipeline.push(matchStage);
  }

  // Date Filter:
  if (fromDate || toDate) {
    const dateFilter: Record<string, unknown> = {};
    if (fromDate) dateFilter.$gte = new Date(fromDate);
    if (toDate) dateFilter.$lte = new Date(toDate);

    pipeline.push({ $match: { createdAt: dateFilter } });
  }

  // Question Lookup:
  pipeline.push(
    {
      $lookup: {
        from: "questions",
        localField: "question",
        foreignField: "_id",
        as: "questionDetails",
      },
    },
    {
      $unwind: {
        path: "$questionDetails",
        preserveNullAndEmptyArrays: false,
      },
    },
  );

  // Question Classification filters:
  const questionClassificationMatchingStage: PipelineStage.Match = {
    $match: {},
  };

  if (type && Array.isArray(type) && type?.length > 0) {
    questionClassificationMatchingStage.$match["questionDetails.type"] = {
      $in: type,
    };
  }

  if (difficulty && Array.isArray(difficulty) && difficulty?.length > 0) {
    questionClassificationMatchingStage.$match["questionDetails.difficulty"] =
    {
      $in: difficulty,
    };
  }

  if (Object.keys(questionClassificationMatchingStage.$match).length > 0) {
    pipeline.push(questionClassificationMatchingStage);
  }

  // Question Live version lookup:
  pipeline.push(
    {
      $lookup: {
        from: "questionversions",
        let: {
          questionId: "$questionDetails._id",
        },
        pipeline: [
          {
            $match: {
              $expr: {
                $eq: ["$$questionId", "$question"],
              },
              isCurrent: true,
            },
          },
        ],
        as: "currentVersion",
      },
    },
    {
      $unwind: {
        path: "$currentVersion",
        preserveNullAndEmptyArrays: true,
      },
    },
  );


  if (searchTerm) {
    pipeline.push({
      $match: {
        $or: ["questionDetails.code", "questionDetails.slug", 'currentVersion.plainStem', 'currentVersion.stem', "year"].map((field) => ({
          [field]: { $regex: searchTerm, $options: "i" },
        })),
      },
    });
  }

  // Subject Lookup:
  pipeline.push(
    {
      $lookup: {
        from: "collections",
        localField: "coll",
        foreignField: "_id",
        as: "collectionDetails",
        pipeline: [
          {
            $project: {
              nameEn: 1,
              nameBn: 1,
              slug: 1,
              status: 1,
            },
          },
        ],
      },
    },

    {
      $unwind: {
        path: "$collectionDetails",
        preserveNullAndEmptyArrays: true,
      },
    },

    {
      $lookup: {
        from: "categories",
        localField: "category",
        foreignField: "_id",
        as: "categoryDetails",
        pipeline: [
          {
            $project: {
              nameEn: 1,
              nameBn: 1,
              slug: 1,
              status: 1,
            },
          },
        ],
      },
    },

    {
      $unwind: {
        path: "$categoryDetails",
        preserveNullAndEmptyArrays: true,
      },
    },

    {
      $lookup: {
        from: "tracks",
        localField: "track",
        foreignField: "_id",
        as: "trackDetails",
        pipeline: [
          {
            $project: {
              nameEn: 1,
              nameBn: 1,
              slug: 1,
              status: 1,
            },
          },
        ],
      },
    },

    {
      $unwind: {
        path: "$trackDetails",
        preserveNullAndEmptyArrays: true,
      },
    },

    {
      $lookup: {
        from: "subjects",
        localField: "subject",
        foreignField: "_id",
        as: "subjectDetails",
        pipeline: [
          {
            $project: {
              nameBn: 1,
              nameEn: 1,
              code: 1,
              colorCode: 1,
              status: 1,
              slug: 1,
            },
          },
        ],
      },
    },
    {
      $unwind: {
        path: "$subjectDetails",
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $lookup: {
        from: "topics",
        localField: "topic",
        foreignField: "_id",
        as: "topicDetails",
        pipeline: [
          { $project: { nameBn: 1, nameEn: 1, slug: 1, status: 1 } },
        ],
      },
    },
    {
      $unwind: { path: "$topicDetails", preserveNullAndEmptyArrays: true },
    },
    {
      $lookup: {
        from: "pastexams",
        localField: "pastExam",
        foreignField: "_id",
        as: "pastExamDetails",
        pipeline: [
          {
            $project: {
              nameBn: 1,
              nameEn: 1,
              year: 1,
              slug: 1,
              status: 1,
            },
          },
        ],
      },
    },
    {
      $unwind: {
        path: "$pastExamDetails",
        preserveNullAndEmptyArrays: true,
      },
    },
  );


  if (includeInActiveQuestion) {
    const conditions = [
      {
        "questionDetails.status": {
          $ne: QUESTION_STATUS.PUBLISHED,
        },
      },
      {
        "collectionDetails.status": {
          $ne: COLLECTION_STATUS.PUBLISHED,
        },
      },
      {
        "categoryDetails.status": {
          $ne: categoryStatus.PUBLISHED,
        },
      },
      {
        "subjectDetails.status": {
          $ne: SUBJECT_STATUS.PUBLISHED,
        },
      },
      {
        "topicDetails.status": {
          $ne: TOPIC_STATUS.PUBLISHED,
        },
      },
      {
        track: { $ne: null },
        "trackDetails.status": { $ne: trackStatus.PUBLISHED },
      },

      {
        pastExam: { $ne: null },
        "pastExamDetails.status": { $ne: EXAM_STATUS.PUBLISHED },
      },
    ];

    pipeline.push({
      $match: {
        $or: conditions
      }
    })

  }


  pipeline.push({
    $project: {
      _id: 0,
      mappingId: "$_id",
      marks: '$marks',
      sortOrder: 1,
      year: "$year",
      createdAt: "$createdAt",

      // collection Details: 
      collection: {
        collectionId: "$collectionDetails._id",
        nameEn: '$collectionDetails.nameEn',
        nameBn: '$collectionDetails.nameBn',
        slug: '$collectionDetails.slug',
        status: '$collectionDetails.status',
      },

      // category details
      category: {
        categoryId: "$categoryDetails._id",
        nameEn: '$categoryDetails.nameEn',
        nameBn: '$categoryDetails.nameBn',
        slug: '$categoryDetails.slug',
        status: '$categoryDetails.status',
      },

      track: {
        trackId: { $ifNull: ["$trackDetails._id", null] },
        nameEn: { $ifNull: ['$trackDetails.nameEn', null] },
        nameBn: { $ifNull: ['$trackDetails.nameBn', null] },
        slug: { $ifNull: ['$trackDetails.slug', null] },
        status: { $ifNull: ['$trackDetails.status', null] },
      },

      subject: {
        subjectId: { $ifNull: ["$subjectDetails._id", null] },
        nameEn: { $ifNull: ['$subjectDetails.nameEn', null] },
        nameBn: { $ifNull: ['$subjectDetails.nameBn', null] },
        code: { $ifNull: ['$subjectDetails.code', null] },
        colorCode: { $ifNull: ['$subjectDetails.colorCode', null] },
        status: { $ifNull: ['$subjectDetails.status', null] },
        slug: { $ifNull: ['$subjectDetails.slug', null] },
      },

      topic: {
        topicId: { $ifNull: ["$topicDetails._id", null] },
        nameEn: { $ifNull: ['$topicDetails.nameEn', null] },
        nameBn: { $ifNull: ['$topicDetails.nameBn', null] },
        slug: { $ifNull: ['$topicDetails.slug', null] },
        status: { $ifNull: ['$topicDetails.status', null] },
      },

      pastExam: {
        pastExamId: { $ifNull: ["$pastExamDetails._id", null] },
        nameEn: { $ifNull: ['$pastExamDetails.nameEn', null] },
        nameBn: { $ifNull: ['$pastExamDetails.nameBn', null] },
        year: { $ifNull: ['$pastExamDetails.year', null] },
        slug: { $ifNull: ['$pastExamDetails.slug', null] },
        status: { $ifNull: ['$pastExamDetails.status', null] },
      },

      question: {
        id: "$questionDetails._id",
        code: "$questionDetails.code",
        slug: "$questionDetails.slug",
        type: "$questionDetails.type",
        difficulty: "$questionDetails.difficulty",
        status: "$questionDetails.status",
        isFlagged: "$questionDetails.isFlagged",
        passageId: { $ifNull: ["$questionDetails.passageId", null] },
      },

      questionVersion: {
        stem: { $ifNull: ["$currentVersion.stem", null] },
        plainStem: { $ifNull: ["$currentVersion.plainStem", null] },
        explanation: { $ifNull: ["$currentVersion.explanation", null] },
        language: { $ifNull: ["$currentVersion.language", "bn"] },
        mediaUrl: { $ifNull: ["$currentVersion.mediaUrl", null] },
        orderingItems: {
          $cond: [
            { $eq: ["$questionDetails.type", "ordering"] },
            "$currentVersion.orderingItems",
            "$$REMOVE",
          ],
        },
        pairs: {
          $cond: [
            { $eq: ["$questionDetails.type", "matching"] },
            "$currentVersion.pairs",
            "$$REMOVE",
          ],
        },
        acceptedAnswers: {
          $cond: [
            { $eq: ["$questionDetails.type", "fill_blank"] },
            "$currentVersion.acceptedAnswers",
            "$$REMOVE",
          ],
        },
        options: {
          $cond: [
            { $in: ["$questionDetails.type", ["true_false", "single_mcq", "multi_mcq"]] },
            "$currentVersion.options",
            "$$REMOVE",
          ],
        }
      },
    }
  })



  pipeline.push({ $sort: { [sortBy]: sortOrder } });

  pipeline.push({
    $facet: {
      data: [{ $skip: skip }, { $limit: limit }],
      meta: [{ $count: "total" }],
    },
  });

  const aggregated = await QuestionMapping.aggregate(pipeline);

  const data = aggregated?.[0]?.data || [];
  const total = aggregated?.[0]?.meta?.[0]?.total || 0;



  return {
    data,
    meta: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit) || 1,
    },
  };
};

// 4. GET QUESTION MAPPING BY ID
const getQuestionMappingById = async (id: string) => {
  const objectId = new mongoose.Types.ObjectId(id);

  const pipeline: PipelineStage[] = [
    { $match: { _id: objectId } },
    {
      $lookup: {
        from: "questions",
        localField: "question",
        foreignField: "_id",
        as: "questionDetails",
      },
    },
    {
      $unwind: {
        path: "$questionDetails",
        preserveNullAndEmptyArrays: false,
      },
    },
    {
      $lookup: {
        from: "questionversions",
        let: {
          questionId: "$questionDetails._id",
        },
        pipeline: [
          {
            $match: {
              $expr: {
                $eq: ["$$questionId", "$question"],
              },
              isCurrent: true,
            },
          },
        ],
        as: "currentVersion",
      },
    },
    {
      $unwind: {
        path: "$currentVersion",
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $lookup: {
        from: "collections",
        localField: "coll",
        foreignField: "_id",
        as: "collectionDetails",
        pipeline: [
          {
            $project: {
              nameEn: 1,
              nameBn: 1,
              slug: 1,
              status: 1,
            },
          },
        ],
      },
    },
    {
      $unwind: {
        path: "$collectionDetails",
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $lookup: {
        from: "categories",
        localField: "category",
        foreignField: "_id",
        as: "categoryDetails",
        pipeline: [
          {
            $project: {
              nameEn: 1,
              nameBn: 1,
              slug: 1,
              status: 1,
            },
          },
        ],
      },
    },
    {
      $unwind: {
        path: "$categoryDetails",
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $lookup: {
        from: "tracks",
        localField: "track",
        foreignField: "_id",
        as: "trackDetails",
        pipeline: [
          {
            $project: {
              nameEn: 1,
              nameBn: 1,
              slug: 1,
              status: 1,
            },
          },
        ],
      },
    },
    {
      $unwind: {
        path: "$trackDetails",
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $lookup: {
        from: "subjects",
        localField: "subject",
        foreignField: "_id",
        as: "subjectDetails",
        pipeline: [
          {
            $project: {
              nameBn: 1,
              nameEn: 1,
              code: 1,
              colorCode: 1,
              status: 1,
              slug: 1,
            },
          },
        ],
      },
    },
    {
      $unwind: {
        path: "$subjectDetails",
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $lookup: {
        from: "topics",
        localField: "topic",
        foreignField: "_id",
        as: "topicDetails",
        pipeline: [
          { $project: { nameBn: 1, nameEn: 1, slug: 1, status: 1 } },
        ],
      },
    },
    {
      $unwind: { path: "$topicDetails", preserveNullAndEmptyArrays: true },
    },
    {
      $lookup: {
        from: "pastexams",
        localField: "pastExam",
        foreignField: "_id",
        as: "pastExamDetails",
        pipeline: [
          {
            $project: {
              nameBn: 1,
              nameEn: 1,
              year: 1,
              slug: 1,
              status: 1,
            },
          },
        ],
      },
    },
    {
      $unwind: {
        path: "$pastExamDetails",
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $project: {
        _id: 0,
        mappingId: "$_id",
        marks: "$marks",
        sortOrder: 1,
        year: "$year",
        createdAt: "$createdAt",
        updatedAt: "$updatedAt",

        collection: {
          collectionId: "$collectionDetails._id",
          nameEn: "$collectionDetails.nameEn",
          nameBn: "$collectionDetails.nameBn",
          slug: "$collectionDetails.slug",
          status: "$collectionDetails.status",
        },

        category: {
          categoryId: "$categoryDetails._id",
          nameEn: "$categoryDetails.nameEn",
          nameBn: "$categoryDetails.nameBn",
          slug: "$categoryDetails.slug",
          status: "$categoryDetails.status",
        },

        track: {
          trackId: { $ifNull: ["$trackDetails._id", null] },
          nameEn: { $ifNull: ["$trackDetails.nameEn", null] },
          nameBn: { $ifNull: ["$trackDetails.nameBn", null] },
          slug: { $ifNull: ["$trackDetails.slug", null] },
          status: { $ifNull: ["$trackDetails.status", null] },
        },

        subject: {
          subjectId: { $ifNull: ["$subjectDetails._id", null] },
          nameEn: { $ifNull: ["$subjectDetails.nameEn", null] },
          nameBn: { $ifNull: ["$subjectDetails.nameBn", null] },
          code: { $ifNull: ["$subjectDetails.code", null] },
          colorCode: { $ifNull: ["$subjectDetails.colorCode", null] },
          status: { $ifNull: ["$subjectDetails.status", null] },
          slug: { $ifNull: ["$subjectDetails.slug", null] },
        },

        topic: {
          topicId: { $ifNull: ["$topicDetails._id", null] },
          nameEn: { $ifNull: ["$topicDetails.nameEn", null] },
          nameBn: { $ifNull: ["$topicDetails.nameBn", null] },
          slug: { $ifNull: ["$topicDetails.slug", null] },
          status: { $ifNull: ["$topicDetails.status", null] },
        },

        pastExam: {
          pastExamId: { $ifNull: ["$pastExamDetails._id", null] },
          nameEn: { $ifNull: ["$pastExamDetails.nameEn", null] },
          nameBn: { $ifNull: ["$pastExamDetails.nameBn", null] },
          year: { $ifNull: ["$pastExamDetails.year", null] },
          slug: { $ifNull: ["$pastExamDetails.slug", null] },
          status: { $ifNull: ["$pastExamDetails.status", null] },
        },

        question: {
          id: "$questionDetails._id",
          code: "$questionDetails.code",
          slug: "$questionDetails.slug",
          type: "$questionDetails.type",
          difficulty: "$questionDetails.difficulty",
          status: "$questionDetails.status",
          isFlagged: "$questionDetails.isFlagged",
          passageId: { $ifNull: ["$questionDetails.passageId", null] },
        },

        questionVersion: {
          stem: { $ifNull: ["$currentVersion.stem", null] },
          plainStem: { $ifNull: ["$currentVersion.plainStem", null] },
          explanation: { $ifNull: ["$currentVersion.explanation", null] },
          language: { $ifNull: ["$currentVersion.language", "bn"] },
          mediaUrl: { $ifNull: ["$currentVersion.mediaUrl", null] },
          orderingItems: {
            $cond: [
              { $eq: ["$questionDetails.type", "ordering"] },
              "$currentVersion.orderingItems",
              "$$REMOVE",
            ],
          },
          pairs: {
            $cond: [
              { $eq: ["$questionDetails.type", "matching"] },
              "$currentVersion.pairs",
              "$$REMOVE",
            ],
          },
          acceptedAnswers: {
            $cond: [
              { $eq: ["$questionDetails.type", "fill_blank"] },
              "$currentVersion.acceptedAnswers",
              "$$REMOVE",
            ],
          },
          options: {
            $cond: [
              {
                $in: [
                  "$questionDetails.type",
                  ["true_false", "single_mcq", "multi_mcq"],
                ],
              },
              "$currentVersion.options",
              "$$REMOVE",
            ],
          },
        },
      },
    },
  ];

  const results = await QuestionMapping.aggregate(pipeline);

  if (!results || results.length === 0) {
    throw new NotFoundError("Question mapping not found.");
  }

  return results[0];
};

// 5. DELETE QUESTION MAPPING BY ID
const deleteQuestionMappingById = async (id: string) => {
  const existingMapping = await QuestionMapping.findById(id);

  if (!existingMapping) {
    throw new NotFoundError("Question mapping not found.");
  }

  // TODO: ভবিষ্যতে Exam মডিউল আসলে চেক করবেন:
  // const isUsedInExam = await Exam.exists({ "questions.mappingId": id });
  // if (isUsedInExam) throw new BadRequest("Cannot delete: used in exams.");

  const mongoSession = await mongoose.startSession();

  try {
    mongoSession.startTransaction();

    // ১. PastExam থাকলে mappedQuestions ১ কমাতে হবে
    if (existingMapping.pastExam) {
      await PastExam.findByIdAndUpdate(
        existingMapping.pastExam,
        { $inc: { mappedQuestions: -1 } },
        { session: mongoSession },
      );
    }

    // ২. ম্যাপিং ডিলিট
    const deletedMapping = await QuestionMapping.findByIdAndDelete(id, {
      session: mongoSession,
    });

    await mongoSession.commitTransaction();
    return deletedMapping;
  } catch (error) {
    if (mongoSession.inTransaction()) {
      await mongoSession.abortTransaction();
    }
    throw error;
  } finally {
    await mongoSession.endSession();
  }
};

export const questionMappingServices = {
  createQuestionMapping,
  updateQuestionMapping,
  getAllQuestionMapping,
  getQuestionMappingById,
  deleteQuestionMappingById,
};
