import { Types, type PipelineStage } from "mongoose";
import type {
  TCreatePastExamPayloadType,
  TUpdatePastExamPayloadType,
  TGetAllPastExamQueryParamsType,
  TGetAllPublishedPastExamQueryParamsType,
} from "./past-exam.validations";
import { BadRequest, ConflictError, NotFoundError } from "../../errors";
import { PastExam } from "./past-exam.model";
import {
  EXAM_STATUS,
  pastExamProjection,
  pastExamSearchableFields,
  pastExamSortableFields,
  type TPastExamProjectType,
} from "./past-exam.constants";
import type { IUserDoc } from "../User";
import { Category, categoryStatus } from "../Category";
import { Track, trackStatus } from "../Track";
import { createSlug, generateSlug, formatQuery } from "@/app/utils";

// 1. CREATE PAST EXAM
const createPastExam = async (
  user: IUserDoc,
  payload: TCreatePastExamPayloadType,
) => {
  const { category, track, nameBn, nameEn, year, description, totalQuestions } =
    payload;

  const existingCategory = await Category.findById(category);

  if (!existingCategory) {
    throw new NotFoundError("The selected category could not be found.");
  }

  if (existingCategory.status !== categoryStatus.PUBLISHED) {
    throw new BadRequest(
      `Past exams can only be created under published categories. The selected category is currently in ${existingCategory.status} status.`,
    );
  }

  // Track validation
  if (track) {
    const existingTrack = await Track.findById(track);

    if (!existingTrack) {
      throw new NotFoundError("The selected track could not be found.");
    }

    if (existingTrack.status !== trackStatus.PUBLISHED) {
      throw new BadRequest(
        `Past exams can only be created under published tracks. The selected track is currently in ${existingTrack.status} status.`,
      );
    }

    if (existingTrack.category.toString() !== existingCategory._id.toString()) {
      throw new BadRequest(
        "The selected track does not belong to the specified category.",
      );
    }
  }

  const slug =  generateSlug(`${nameEn}-${year}`);

  // Duplicate slug check:
  const duplicateExam = await PastExam.findOne({
    slug,
  });

  if (duplicateExam) {
    throw new ConflictError(
      "A past exam with the same name and year already exists.",
    );
  }

  const result = await PastExam.create({
    category,
    track: track || null,
    nameBn,
    nameEn,
    slug,
    year,
    description: description || null,
    totalQuestions: totalQuestions || 0,
    status: EXAM_STATUS.DRAFT,
    author: user?._id,
  });

  return result;
};

// 2. UPDATE PAST EXAM
const updatePastExam = async (
  id: string,
  payload: TUpdatePastExamPayloadType,
) => {
  const existingExam = await PastExam.findById(id);

  if (!existingExam) {
    throw new NotFoundError("Past exam not found.");
  }

  const targetCategoryId = payload.category ?? existingExam.category;

  // If category changed, validate it
  if (
    payload.category &&
    payload.category.toString() !== existingExam.category.toString()
  ) {
    const existingCategory = await Category.findById(payload.category);

    if (!existingCategory) {
      throw new NotFoundError("The selected category could not be found.");
    }

    if (existingCategory.status !== categoryStatus.PUBLISHED) {
      throw new BadRequest(
        `Past exams can only belong to published categories. The selected category is currently in ${existingCategory.status} status.`,
      );
    }
  }

  // If track is changing or category changed, validate track
  const targetTrackId =
    payload.track !== undefined ? payload.track : existingExam.track;

  if (targetTrackId) {
    const existingTrack = await Track.findById(targetTrackId);

    if (!existingTrack) {
      throw new NotFoundError("The selected track could not be found.");
    }

    if (existingTrack.status !== trackStatus.PUBLISHED) {
      throw new BadRequest(
        `Past exams can only belong to published tracks. The selected track is currently in ${existingTrack.status} status.`,
      );
    }

    if (existingTrack.category.toString() !== targetCategoryId.toString()) {
      throw new BadRequest(
        "The selected track does not belong to the specified category.",
      );
    }
  }

  // Name or Year change -> regenerate slug
  const updatedNameEn = payload.nameEn ?? existingExam.nameEn;
  const updatedYear = payload.year ?? existingExam.year;

  if (payload.nameEn !== undefined || payload.year !== undefined) {
    if (
      updatedNameEn !== existingExam.nameEn ||
      updatedYear !== existingExam.year
    ) {
   
      const newSlug = generateSlug(`${updatedNameEn}-${updatedYear}`);

      const duplicate = await PastExam.findOne({
        slug: newSlug,
        _id: { $ne: id },
      });

      if (duplicate) {
        throw new ConflictError(
          "A past exam with the same name and year already exists.",
        );
      }

      existingExam.slug = newSlug;
      existingExam.nameEn = updatedNameEn;
      existingExam.year = updatedYear;
    }
  }

  if (payload.nameBn !== undefined) existingExam.nameBn = payload.nameBn;
  if (payload.category !== undefined)
    existingExam.category = new Types.ObjectId(payload.category);
  if (payload.track !== undefined)
    existingExam.track = payload.track
      ? new Types.ObjectId(payload.track)
      : null;
  if (payload.description !== undefined)
    existingExam.description = payload.description;
  if (payload.totalQuestions !== undefined)
    existingExam.totalQuestions = payload.totalQuestions;
  if (payload.status !== undefined) existingExam.status = payload.status;

  await existingExam.save({ validateBeforeSave: true });

  return existingExam;
};

// 3. GET ALL PAST EXAM
const getAllPastExam = async (query: TGetAllPastExamQueryParamsType) => {
  const {
    category,
    track,
    year,
    status,
    categoryStatus,
    trackStatus,
    projection,
  } = query;

  const { page, limit, skip, searchTerm, sortOrder, sortBy, fromDate, toDate } =
    formatQuery(query, pastExamSortableFields);

  const pipeline: PipelineStage[] = [];

  const preMatch: Record<string, unknown> = {};
  if (category) preMatch.category = new Types.ObjectId(category);
  if (track) preMatch.track = new Types.ObjectId(track);
  if (year) preMatch.year = year;
  if (Object.keys(preMatch).length > 0) {
    pipeline.push({ $match: preMatch });
  }

  pipeline.push(
    {
      $lookup: {
        from: "categories",
        localField: "category",
        foreignField: "_id",
        as: "categoryDetails",
        pipeline: [
          {
            $project: {
              _id: 1,
              nameEn: 1,
              nameBn: 1,
              status: 1,
              icon: 1,
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
              _id: 1,
              nameEn: 1,
              nameBn: 1,
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
      $addFields: {
        categoryNameEn: "$categoryDetails.nameEn",
        categoryNameBn: "$categoryDetails.nameBn",
        categoryStatus: "$categoryDetails.status",
        trackNameEn: "$trackDetails.nameEn",
        trackNameBn: "$trackDetails.nameBn",
        trackStatus: "$trackDetails.status",
      },
    },
  );

  const matchStage: PipelineStage.Match = { $match: {} };

  if (status !== undefined) {
    matchStage.$match["status"] = status;
  }

  if (categoryStatus !== undefined) {
    matchStage.$match["categoryStatus"] = categoryStatus;
  }

  if (trackStatus !== undefined) {
    matchStage.$match["trackStatus"] = trackStatus;
  }

  if (Object.keys(matchStage.$match).length > 0) {
    pipeline.push(matchStage);
  }

  if (fromDate || toDate) {
    const dateFilter: Record<string, unknown> = {};
    if (fromDate) dateFilter.$gte = new Date(fromDate);
    if (toDate) dateFilter.$lte = new Date(toDate);

    pipeline.push({ $match: { createdAt: dateFilter } });
  }

  if (searchTerm) {
    pipeline.push({
      $match: {
        $or: pastExamSearchableFields.map((field) => ({
          [field]: { $regex: searchTerm, $options: "i" },
        })),
      },
    });
  }

  const projectionFields =
    pastExamProjection[
      (projection as TPastExamProjectType) || "details"
    ];

  pipeline.push({
    $project: projectionFields,
  });

  pipeline.push({ $sort: { [sortBy]: sortOrder } });

  pipeline.push({
    $facet: {
      data: [{ $skip: skip }, { $limit: limit }],
      meta: [{ $count: "total" }],
    },
  });

  const aggregated = await PastExam.aggregate(pipeline);

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

// 3.1 GET ALL PUBLISHED PAST EXAM
const getAllPublishedPastExam = async (
  query: TGetAllPublishedPastExamQueryParamsType,
) => {
  return getAllPastExam({
    ...query,
    status: EXAM_STATUS.PUBLISHED,
    categoryStatus: categoryStatus.PUBLISHED,
  });
};

// Helper: shared aggregation pipeline stages for single exam lookups
const buildSingleExamLookupPipeline = () => [
  {
    $lookup: {
      from: "categories",
      localField: "category",
      foreignField: "_id",
      as: "categoryDetails",
      pipeline: [
        {
          $project: {
            _id: 1,
            nameEn: 1,
            nameBn: 1,
            status: 1,
            icon: 1,
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
            _id: 1,
            nameEn: 1,
            nameBn: 1,
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
      from: "users",
      localField: "author",
      foreignField: "_id",
      as: "authorDetails",
      pipeline: [
        {
          $project: {
            _id: 1,
            name: 1,
            email: 1,
            role: 1,
          },
        },
      ],
    },
  },
  {
    $unwind: {
      path: "$authorDetails",
      preserveNullAndEmptyArrays: true,
    },
  },
  {
    $project: {
      _id: 0,
      pastExamId: "$_id",

      categoryId: "$categoryDetails._id",
      categoryNameEn: "$categoryDetails.nameEn",
      categoryNameBn: "$categoryDetails.nameBn",
      categoryStatus: "$categoryDetails.status",
      categoryIcon: { $ifNull: ["$categoryDetails.icon", null] },

      trackId: { $ifNull: ["$trackDetails._id", null] },
      trackNameEn: { $ifNull: ["$trackDetails.nameEn", null] },
      trackNameBn: { $ifNull: ["$trackDetails.nameBn", null] },
      trackStatus: { $ifNull: ["$trackDetails.status", null] },

      authorId: { $ifNull: ["$authorDetails._id", null] },
      authorName: { $ifNull: ["$authorDetails.name", null] },
      authorEmail: { $ifNull: ["$authorDetails.email", null] },
      authorRole: { $ifNull: ["$authorDetails.role", null] },

      nameBn: "$nameBn",
      nameEn: "$nameEn",
      slug: "$slug",
      year: "$year",
      description: { $ifNull: ["$description", null] },
      totalQuestions: "$totalQuestions",
      status: "$status",

      publishedAt: { $ifNull: ["$publishedAt", null] },
      archivedAt: { $ifNull: ["$archivedAt", null] },

      createdAt: "$createdAt",
      updatedAt: "$updatedAt",
    },
  },
];

// 4. GET PAST EXAM BY ID
const getPastExamById = async (id: string) => {
  const pipeline: PipelineStage[] = [
    { $match: { _id: new Types.ObjectId(id) } },
    ...buildSingleExamLookupPipeline(),
  ];

  const result = await PastExam.aggregate(pipeline);

  if (!result.length) {
    throw new NotFoundError("Past exam not found.");
  }

  return result[0];
};

// 4.1 GET PAST EXAM BY SLUG
const getPastExamBySlug = async (slug: string) => {
  const pipeline: PipelineStage[] = [
    { $match: { slug } },
    ...buildSingleExamLookupPipeline(),
  ];

  const result = await PastExam.aggregate(pipeline);

  if (!result.length) {
    throw new NotFoundError("Past exam not found.");
  }

  return result[0];
};

// 5. DELETE PAST EXAM BY ID
const deletePastExamById = async (id: string) => {
  const result = await PastExam.findByIdAndDelete(id);

  if (!result) {
    throw new NotFoundError("Past exam not found.");
  }

  return result;
};

// 6. MARK AS PUBLISHED
const markAsPublished = async (id: string) => {
  const pastExam = await PastExam.findById(id);

  if (!pastExam) {
    throw new NotFoundError("Past exam not found.");
  }

  const category = await Category.findById(pastExam.category);
  if (!category) {
    throw new NotFoundError("Category not found.");
  }

  if (category.status !== categoryStatus.PUBLISHED) {
    throw new BadRequest(
      `Cannot publish past exam because its category is ${category.status}. Category must be published first.`,
    );
  }

  if (pastExam.track) {
    const track = await Track.findById(pastExam.track);
    if (!track) {
      throw new NotFoundError("Track not found.");
    }

    if (track.status !== trackStatus.PUBLISHED) {
      throw new BadRequest(
        `Cannot publish past exam because its track is ${track.status}. Track must be published first.`,
      );
    }
  }

  if (pastExam.status === EXAM_STATUS.ARCHIVED) {
    throw new BadRequest("You cannot publish an archived past exam.");
  }

  if (pastExam.status === EXAM_STATUS.PUBLISHED) {
    throw new BadRequest("This past exam has already been published.");
  }

  pastExam.status = EXAM_STATUS.PUBLISHED;
  pastExam.publishedAt = new Date();

  await pastExam.save({ validateBeforeSave: true });

  return pastExam;
};

// 7. MARK AS ARCHIVED
const markAsArchived = async (id: string) => {
  const pastExam = await PastExam.findById(id);

  if (!pastExam) {
    throw new NotFoundError("Past exam not found.");
  }

  if (pastExam.status === EXAM_STATUS.DRAFT) {
    throw new BadRequest("You cannot archive a drafted past exam.");
  }

  if (pastExam.status === EXAM_STATUS.ARCHIVED) {
    throw new BadRequest("This past exam has already been archived.");
  }

  pastExam.status = EXAM_STATUS.ARCHIVED;
  pastExam.archivedAt = new Date();

  await pastExam.save({ validateBeforeSave: true });

  return pastExam;
};

export const pastExamServices = {
  createPastExam,
  updatePastExam,
  getAllPastExam,
  getAllPublishedPastExam,
  getPastExamById,
  getPastExamBySlug,
  deletePastExamById,
  markAsPublished,
  markAsArchived,
};
