import type { PipelineStage, Types } from "mongoose";
import type { TGetAllMediaQueryParamsType } from "./media.validations";
import { BadRequest } from "../../errors";
import { Media } from "./media.model";
import {
  MEDIA_STATUS,
  mediaSearchableFields,
  mediaSortableFields,
  type TMediaStatus,
} from "./media.constants";
import type { TMulterFile } from "@/app/interfaces/multer.types";
import uploadFileIntoCloudinary from "@/app/utils/cloudinary/upload-file";
import { File_FOLDER_NAME } from "@/app/constants/folder_name";
import {
  deleteFileByUrl,
  getPublicId,
} from "@/app/utils/cloudinary/delete-file";
import moment from "moment";
import { formatQuery, logger } from "@/app/utils";
import { deleteFilesByUrls } from "@/app/utils/cloudinary/delete-files";
import { QuestionVersion } from "../QuestionVersion";
import { Passage } from "../Passage";
import { User } from "../User";
import { Topic } from "../Topic";
import { Subject } from "../Subject";

// 1. CREATE MEDIA
const createMedia = async (userId: Types.ObjectId, file: TMulterFile) => {
  // Check  is file exists ?:
  if (!file) {
    throw new BadRequest("Image file is  required.");
  }

  const uploadedFile = await uploadFileIntoCloudinary(
    file,
    File_FOLDER_NAME.MEDIA,
  );

  if (!uploadedFile?.secure_url) {
    throw new BadRequest("Failed to upload image.");
  }

  try {
    // Saved media:
    const savedMedia = await Media.create({
      url: uploadedFile?.secure_url,
      publicId: uploadedFile.public_id,
      status: MEDIA_STATUS.UNATTACHED,
      uploadedBy: userId,
    });

    if (!savedMedia) {
      throw new BadRequest("Failed to save media.");
    }

    return savedMedia;
  } catch (error) {
    deleteFileByUrl(uploadedFile.secure_url).catch((err) => console.log(err));
    throw error;
  }
};

// 3. Update media status:
const updateStatus = async (urls: string[], status: TMediaStatus) => {
  if (!urls || urls.length < 1) {
    return;
  }

  // public Ids
  const publicIds = urls.map((url) => getPublicId(url)).filter(Boolean);

  // validate public Ids:
  if (publicIds.length < 1) {
    return;
  }

  await Media.updateMany(
    {
      publicId: {
        $in: publicIds,
      },
    },
    {
      $set: {
        status,
      },
    },
    {
      runValidators: true,
    },
  );
};

export interface IAttachMediaEntity {
  entityType: string;
  entityId: Types.ObjectId | string;
}

// 2. Attach images by urls and link to referencing entity:
const attachImages = async (
  urls: string[],
  entity?: IAttachMediaEntity,
) => {
  if (!urls || urls.length < 1) return;

  const publicIds = urls.map((url) => getPublicId(url)).filter(Boolean);
  if (publicIds.length < 1) return;

  if (entity) {
    // 1. Idempotently add entity to references
    await Media.updateMany(
      { publicId: { $in: publicIds } },
      {
        $addToSet: {
          references: {
            entityType: entity.entityType,
            entityId: entity.entityId,
          },
        },
      },
    );

    // 2. Recalculate refCount and ensure status is ATTACHED
    await Media.updateMany(
      { publicId: { $in: publicIds } },
      [
        {
          $set: {
            refCount: { $size: { $ifNull: ["$references", []] } },
            status: MEDIA_STATUS.ATTACHED,
          },
        },
      ],
      { updatePipeline: true },
    );
  } else {
    // Fallback if no specific entity provided
    await Media.updateMany(
      { publicId: { $in: publicIds } },
      [
        {
          $set: {
            refCount: { $max: [1, { $add: [{ $ifNull: ["$refCount", 0] }, 1] }] },
            status: MEDIA_STATUS.ATTACHED,
          },
        },
      ],
      { updatePipeline: true },
    );
  }
};

// 3. Unattach images urls and unlink from referencing entity:
const unattachImages = async (
  urls: string[],
  entity?: IAttachMediaEntity,
) => {
  if (!urls || urls.length < 1) return;

  const publicIds = urls.map((url) => getPublicId(url)).filter(Boolean);
  if (publicIds.length < 1) return;

  if (entity) {
    // 1. Pull the entity from references
    await Media.updateMany(
      { publicId: { $in: publicIds } },
      {
        $pull: {
          references: {
            entityType: entity.entityType,
            entityId: entity.entityId,
          },
        },
      },
    );

    // 2. Recalculate refCount and status based on remaining references
    await Media.updateMany(
      { publicId: { $in: publicIds } },
      [
        {
          $set: {
            refCount: { $size: { $ifNull: ["$references", []] } },
          },
        },
        {
          $set: {
            status: {
              $cond: {
                if: { $lte: ["$refCount", 0] },
                then: MEDIA_STATUS.UNATTACHED,
                else: MEDIA_STATUS.ATTACHED,
              },
            },
          },
        },
      ],
      { updatePipeline: true },
    );
  } else {
    // Fallback if no specific entity provided
    await Media.updateMany(
      { publicId: { $in: publicIds } },
      [
        {
          $set: {
            refCount: {
              $max: [0, { $subtract: [{ $ifNull: ["$refCount", 1] }, 1] }],
            },
          },
        },
        {
          $set: {
            status: {
              $cond: {
                if: { $lte: ["$refCount", 0] },
                then: MEDIA_STATUS.UNATTACHED,
                else: MEDIA_STATUS.ATTACHED,
              },
            },
          },
        },
      ],
      { updatePipeline: true },
    );
  }
};

/**
 * Checks whether an image URL or its publicId is referenced anywhere in the database:
 * - QuestionVersion (stem, explanation, options, matching pairs, ordering items, mediaUrl)
 * - Passage (mediaUrl, ogImage, bodyBn, bodyEn)
 * - User (profileImage)
 * - Topic (ogImage)
 * - Subject (ogImage)
 */
const isMediaReferenced = async (url: string): Promise<boolean> => {
  if (!url) return false;

  const publicId = getPublicId(url);
  const escapedUrl = url.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

  const questionConditions: Record<string, any>[] = [
    { mediaUrl: url },
    { "options.mediaUrl": url },
    { stem: { $regex: escapedUrl, $options: "i" } },
    { explanation: { $regex: escapedUrl, $options: "i" } },
    { "options.content": { $regex: escapedUrl, $options: "i" } },
    { "pairs.left": { $regex: escapedUrl, $options: "i" } },
    { "pairs.right": { $regex: escapedUrl, $options: "i" } },
    { "orderingItems.text": { $regex: escapedUrl, $options: "i" } },
  ];

  if (publicId) {
    const escapedPublicId = publicId.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    questionConditions.push(
      { mediaUrl: { $regex: escapedPublicId, $options: "i" } },
      { "options.mediaUrl": { $regex: escapedPublicId, $options: "i" } },
      { stem: { $regex: escapedPublicId, $options: "i" } },
      { explanation: { $regex: escapedPublicId, $options: "i" } },
      { "options.content": { $regex: escapedPublicId, $options: "i" } },
      { "pairs.left": { $regex: escapedPublicId, $options: "i" } },
      { "pairs.right": { $regex: escapedPublicId, $options: "i" } },
      { "orderingItems.text": { $regex: escapedPublicId, $options: "i" } },
    );
  }

  const questionExists = await QuestionVersion.exists({
    $or: questionConditions,
  });

  if (questionExists) return true;

  const passageConditions: Record<string, any>[] = [
    { mediaUrl: url },
    { ogImage: url },
    { bodyBn: { $regex: escapedUrl, $options: "i" } },
    { bodyEn: { $regex: escapedUrl, $options: "i" } },
  ];

  if (publicId) {
    const escapedPublicId = publicId.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    passageConditions.push(
      { mediaUrl: { $regex: escapedPublicId, $options: "i" } },
      { ogImage: { $regex: escapedPublicId, $options: "i" } },
      { bodyBn: { $regex: escapedPublicId, $options: "i" } },
      { bodyEn: { $regex: escapedPublicId, $options: "i" } },
    );
  }

  const passageExists = await Passage.exists({
    $or: passageConditions,
  });

  if (passageExists) return true;

  const userConditions: Record<string, any>[] = [{ profileImage: url }];
  if (publicId) {
    const escapedPublicId = publicId.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    userConditions.push({
      profileImage: { $regex: escapedPublicId, $options: "i" },
    });
  }

  const userExists = await User.exists({
    $or: userConditions,
  });

  if (userExists) return true;

  const otherConditions: Record<string, any>[] = [{ ogImage: url }];
  if (publicId) {
    const escapedPublicId = publicId.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    otherConditions.push({
      ogImage: { $regex: escapedPublicId, $options: "i" },
    });
  }

  const [topicExists, subjectExists] = await Promise.all([
    Topic.exists({ $or: otherConditions }),
    Subject.exists({ $or: otherConditions }),
  ]);

  return !!(topicExists || subjectExists);
};

// 4. Delete unattached images via cron job (24 hour time frame) per day 100:
const removeOrphanedImages = async () => {
  const now = new Date().toISOString();
  const twentyFourHourAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

  // High-performance compound index lookup: O(1) query on (status + refCount + updatedAt)
  const candidateImages = await Media.find({
    status: MEDIA_STATUS.UNATTACHED,
    refCount: { $lte: 0 },
    updatedAt: {
      $lte: twentyFourHourAgo,
    },
  })
    .select({
      _id: 1,
      url: 1,
      publicId: 1,
    })
    .limit(100)
    .lean();

  if (!candidateImages?.length) {
    logger.info(`No orphaned images found for cleanup at => ${now}`);
    return;
  }

  logger.info(
    `Found ${candidateImages.length} unattached candidate images with 0 references for cleanup...`,
  );

  const toDeleteUrls: string[] = [];
  const toDeleteIds: Types.ObjectId[] = [];
  const selfHealIds: Types.ObjectId[] = [];

  for (const img of candidateImages) {
    if (!img.url) continue;

    const inUse = await isMediaReferenced(img.url);

    if (inUse) {
      selfHealIds.push(img._id);
    } else {
      toDeleteUrls.push(img.url);
      toDeleteIds.push(img._id);
    }
  }

  // Self-heal images that are still in use anywhere in DB
  if (selfHealIds.length > 0) {
    await Media.updateMany(
      {
        _id: { $in: selfHealIds },
      },
      {
        $set: { status: MEDIA_STATUS.ATTACHED },
      },
    );
    logger.info(
      `Re-attached ${selfHealIds.length} media items that were still in use.`,
    );
  }

  // Delete truly orphaned images
  if (toDeleteIds.length > 0) {
    logger.info(
      `Found ${toDeleteIds.length} verified orphaned images. Cleaning up...`,
    );
    await deleteFilesByUrls(toDeleteUrls);

    const deleteResult = await Media.deleteMany({
      _id: {
        $in: toDeleteIds,
      },
    });

    logger.info(
      `Successfully removed ${deleteResult.deletedCount} orphaned images at ${now}`,
    );
  }
};

// 3. GET ALL MEDIA
const getAllMedia = async (query: TGetAllMediaQueryParamsType) => {
  const { page, limit, skip, searchTerm, sortOrder, sortBy, fromDate, toDate } =
    formatQuery(query, mediaSortableFields);

  const pipeline: PipelineStage[] = [];

  if (fromDate || toDate) {
    const dateFilter: Record<string, unknown> = {};
    if (fromDate) dateFilter.$gte = new Date(fromDate);
    if (toDate) dateFilter.$lte = new Date(toDate);

    pipeline.push({ $match: { createdAt: dateFilter } });
  }

  if (searchTerm) {
    const escapedSearch = searchTerm.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    pipeline.push({
      $match: {
        $or: mediaSearchableFields.map((field) => ({
          [field]: { $regex: escapedSearch, $options: "i" },
        })),
      },
    });
  }

  pipeline.push({ $sort: { [sortBy]: sortOrder } });

  pipeline.push({
    $facet: {
      data: [{ $skip: skip }, { $limit: limit }],
      meta: [{ $count: "total" }],
    },
  });

  const aggregated = await Media.aggregate(pipeline);

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

export const mediaServices = {
  createMedia,
  getAllMedia,
  attachImages,
  unattachImages,
  removeOrphanedImages,
  isMediaReferenced,
};
