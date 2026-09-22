import { Schema, Types, model } from "mongoose";
import type { ITopicDoc } from "./topic.interfaces";
import { TOPIC_STATUS, TOPIC_VALUES } from "./topic.constants";

const topicSchema = new Schema<ITopicDoc>(
  {
    subject: {
      type: Schema.Types.ObjectId,
      ref: "Subject",
      required: true,
    },

    parentTopic: {
      type: Schema.Types.ObjectId,
      ref: "Topic",
      allowNull: true,
      default: null,
    },

    nameBn: {
      type: String,
      required: true,
    },
    nameEn: {
      type: String,
      required: true,
    },
    slug: {
      type: String,
      required: true,
    },
    iconUrl: {
      type: String,
      allowNull: true,
      default: null,
    },
    descriptionBn: {
      type: String,
      allowNull: true,
      default: null,
    },
    descriptionEn: {
      type: String,
      allowNull: true,
      default: null,
    },
    sortOrder: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
    depth: {
      type: Number,
      required: true,
      default: 1,
    },
    status: {
      type: String,
      enum: TOPIC_VALUES,
      default: TOPIC_STATUS.DRAFT,
    },
    metaTitle: {
      type: String,
      allowNull: true,
      default: null,
      maxLength: 60,
    },
    metaDescription: {
      type: String,
      allowNull: true,
      default: null,
      maxLength: 160,
    },
    ogImage: {
      type: String,
      default: null,
      allowNull: true,
    },

    publishedAt: {
      type: Date,
      allowNull: true,
      default: null,
    },
    archivedAt: {
      type: Date,
      allowNull: true,
      default: null,
    },
    author: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },

  {
    timestamps: true,
    versionKey: false,
  },
);

export const Topic = model<ITopicDoc>("Topic", topicSchema);
