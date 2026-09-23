import httpStatus from "http-status";
import type { PipelineStage } from "mongoose";
import type {
  TCreateTopicPayloadType,
  TUpdateTopicPayloadType,
  TGetAllTopicQueryParamsType,
  TGetAllPublishedTopicQueryParamsType,
} from "./topic.validations";
import { AppError, BadRequest, ConflictError, NotFoundError } from "../../errors";
import { Topic } from "./topic.model";
import { TOPIC_STATUS, topicSearchableFields, topicSortableFields } from "./topic.constants";
import type { IUserDoc } from "../User";
import { Subject, SUBJECT_STATUS } from "../Subject";
import { createSlug, formatQuery } from "@/app/utils";

// 1. CREATE TOPIC
const createTopic = async (user: IUserDoc, payload: TCreateTopicPayloadType) => {
  const { subject: subjectId, nameEn, nameBn, sortOrder, descriptionBn,  descriptionEn, metaDescription, metaTitle, parentTopic, } = payload;



  let depth = 1;
  let existingParentTopic = null;

  if (parentTopic) {

    existingParentTopic = await Topic.findById(parentTopic);
    if (!existingParentTopic) {
      throw new NotFoundError("Parent topic not found.");
    }
    
    if (existingParentTopic.status !== TOPIC_STATUS.PUBLISHED) {
      throw new BadRequest("Cannot create a topic under an unpublished topic.");
    }

    if (existingParentTopic.subject.toString() !== subjectId.toString()) {
      throw new BadRequest("Parent topic subject must be same as topic subject.");
    }
    depth = existingParentTopic.depth + 1;
  }

  const subject = await Subject.findById(subjectId);
  if (!subject) {
    throw new NotFoundError("Subject not found.");
  }

  if (subject.status !== SUBJECT_STATUS.PUBLISHED) {
    throw new BadRequest("Cannot create a topic under an unpublished subject.");
  }


  const slug = createSlug(nameEn);
  const duplicate = await Topic.findOne({ subject: subjectId, slug });
  if (duplicate) {
    throw new ConflictError("A topic with this name already exists under the subject.");
  }

  const newTopicPayload = {
    subject:  subjectId,
    nameBn, 
    nameEn,
    slug,
    descriptionBn,
    descriptionEn,
    sortOrder,
    metaTitle,
    metaDescription,
    parentTopic,
    depth,
    author: user._id,
    status: TOPIC_STATUS.DRAFT,
  };

  const result = await Topic.create(newTopicPayload);
  return result;
};

// 2. UPDATE TOPIC
const updateTopic = async (id: string, payload: TUpdateTopicPayloadType) => {
  const { nameBn, nameEn, descriptionBn, descriptionEn, sortOrder, metaTitle, metaDescription, parentTopic, subject: payloadSubject } = payload;

  // 1. Get existing topic : 
  const existingTopic = await Topic.findById(id);
  if (!existingTopic) {
    throw new NotFoundError("Topic not found.");
  }

  // 2. check if subject is changed then check if the new subject is published or not
  if (payloadSubject && payloadSubject.toString() !== existingTopic.subject.toString()) {
    const subject = await Subject.findById(payloadSubject);
    if (!subject) {
      throw new NotFoundError("Subject not found.");
    }
    if (subject.status !== SUBJECT_STATUS.PUBLISHED) {
      throw new BadRequest("Cannot move a topic under an unpublished subject.");
    }
  }

  const subjectId = payloadSubject || existingTopic.subject;
  let depth = existingTopic.depth;

  // 3. check if parent topic is changed
  if (parentTopic !== undefined && parentTopic?.toString() !== existingTopic?.parentTopic?.toString()) {
    const childCount = await Topic.countDocuments({ parentTopic: existingTopic._id });
    if (childCount > 0) {
      throw new BadRequest("Cannot move a topic that has child topics.");
    }
    if (parentTopic === id.toString()) {
      throw new BadRequest("A topic cannot be its own parent.");
    }

    if (parentTopic) {
      const newParentTopic = await Topic.findById(parentTopic);
      if (!newParentTopic) {
        throw new NotFoundError("Parent topic not found.");
      }
      if (newParentTopic.status !== TOPIC_STATUS.PUBLISHED) {
        throw new BadRequest("Cannot move a topic under an unpublished parent topic.");
      }
      if (newParentTopic.subject.toString() !== subjectId.toString()) {
        throw new BadRequest("Parent topic subject must be same as topic subject.");
      }
      depth = newParentTopic.depth + 1;
    } else {
      depth = 1;
    }
  }

  let slug = existingTopic.slug;

  if (nameEn !== undefined && nameEn !== existingTopic.nameEn) {
    slug = createSlug(nameEn);
    const duplicate = await Topic.findOne({ _id: { $ne: existingTopic._id }, subject: subjectId, slug });
    if (duplicate) {
      throw new ConflictError("A topic with this name already exists under the subject.");
    }
  }

  const updateData: any = { slug, depth };
  if (payloadSubject !== undefined) updateData.subject = payloadSubject;
  if (nameBn !== undefined) updateData.nameBn = nameBn;
  if (nameEn !== undefined) updateData.nameEn = nameEn;
  if (descriptionBn !== undefined) updateData.descriptionBn = descriptionBn;
  if (descriptionEn !== undefined) updateData.descriptionEn = descriptionEn;
  if (sortOrder !== undefined) updateData.sortOrder = sortOrder;
  if (metaTitle !== undefined) updateData.metaTitle = metaTitle;
  if (metaDescription !== undefined) updateData.metaDescription = metaDescription;
  if (parentTopic !== undefined) updateData.parentTopic = parentTopic;

  const result = await Topic.findOneAndUpdate(
    { _id: id },
    { $set: updateData },
    { new: true, runValidators: true },
  );

  if (!result) {
    throw new AppError(httpStatus.NOT_FOUND, "Topic not found");
  }

  return result;
};

// 3. GET ALL TOPIC
const getAllTopic = async (query: TGetAllTopicQueryParamsType) => {
  const { status, subjectId, parentTopicId } = query;
  const { page, limit, skip, searchTerm, sortOrder, sortBy, fromDate, toDate } =
    formatQuery(query, topicSortableFields);

  const pipeline: PipelineStage[] = [];
  const matchStage: PipelineStage.Match = { $match: {} };

  if (status !== undefined) {
    matchStage.$match["status"] = status;
  }
  if (subjectId !== undefined) {
    matchStage.$match["subject"] = subjectId;
  }
  if (parentTopicId !== undefined) {
    matchStage.$match["parentTopic"] = parentTopicId;
  }
  pipeline.push(matchStage);

  if (fromDate || toDate) {
    const dateFilter: Record<string, unknown> = {};
    if (fromDate) dateFilter.$gte = new Date(fromDate);
    if (toDate) dateFilter.$lte = new Date(toDate);

    pipeline.push({ $match: { createdAt: dateFilter } });
  }

  if (searchTerm) {
    pipeline.push({
      $match: {
        $or: topicSearchableFields.map((field) => ({
          [field]: { $regex: searchTerm, $options: "i" },
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

  const aggregated = await Topic.aggregate(pipeline);

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

// 3.1 GET ALL PUBLISHED TOPIC
const getAllPublishedTopic = async (query: TGetAllPublishedTopicQueryParamsType) => {
  return getAllTopic({
    ...query,
    status: TOPIC_STATUS.PUBLISHED,
  });
};

// 4. GET TOPIC BY ID
const getTopicById = async (id: string) => {
  const result = await Topic.findById(id);

  if (!result) {
    throw new AppError(httpStatus.NOT_FOUND, "Topic not found");
  }

  return result;
};

// 5. DELETE TOPIC BY ID
const deleteTopicById = async (id: string) => {
  const childCount = await Topic.countDocuments({ parentTopic: id });
  if (childCount > 0) {
    throw new BadRequest("Cannot delete a topic that has child topics.");
  }

  const result = await Topic.findOneAndDelete({ _id: id });

  if (!result) {
    throw new NotFoundError("Topic not found");
  }

  return result;
};

// 6. Mark as Published
const markAsPublished = async (id: string) => {
  const topic = await Topic.findById(id);
  if (!topic) {
    throw new NotFoundError("Topic not found.");
  }

  const subject = await Subject.findById(topic.subject);
  if (!subject) {
    throw new NotFoundError("Subject not found.");
  }
  if (subject.status !== SUBJECT_STATUS.PUBLISHED) {
    throw new BadRequest(`Cannot publish topic because the subject status is ${subject.status}.`);
  }

  if (topic.parentTopic) {
    const parentTopic = await Topic.findById(topic.parentTopic);
    if (parentTopic && parentTopic.status !== TOPIC_STATUS.PUBLISHED) {
      throw new BadRequest("Cannot publish this topic because its parent topic is not published.");
    }
  }

  if (topic.status === TOPIC_STATUS.ARCHIVED) {
    throw new BadRequest("You cannot publish an archived topic.");
  }
  if (topic.status === TOPIC_STATUS.PUBLISHED) {
    throw new BadRequest("This topic has already been published.");
  }

  topic.status = TOPIC_STATUS.PUBLISHED;
  topic.publishedAt = new Date();

  await topic.save({ validateBeforeSave: true });

  return topic;
};

// 7. Mark as Archived
const markAsArchived = async (id: string) => {
  const activeChildren = await Topic.countDocuments({ parentTopic: id, status: { $ne: TOPIC_STATUS.ARCHIVED } });
  if (activeChildren > 0) {
    throw new BadRequest("Cannot archive a topic that has active child topics. Archive them first.");
  }

  const topic = await Topic.findById(id);
  if (!topic) {
    throw new NotFoundError("Topic not found.");
  }

  if (topic.status === TOPIC_STATUS.DRAFT) {
    throw new BadRequest("You cannot archive a drafted topic.");
  }
  if (topic.status === TOPIC_STATUS.ARCHIVED) {
    throw new BadRequest("This topic has already been archived.");
  }

  topic.status = TOPIC_STATUS.ARCHIVED;
  topic.archivedAt = new Date();

  await topic.save({ validateBeforeSave: true });

  return topic;
};

export const topicServices = {
  createTopic,
  updateTopic,
  getAllTopic,
  getAllPublishedTopic,
  getTopicById,
  deleteTopicById,
  markAsPublished,
  markAsArchived,
};
