import z from "zod";
import {
  optionalNumber,
  optionalString,
  requiredMongooseId,
} from "../../utils";

// 1. GET WEAK TOPICS SCHEMA
const getWeakTopicsSchema = z.object({
  query: z.object({
    subjectId: optionalString("Subject ID"),
    limit: optionalNumber("Limit"),
    minAttempts: optionalNumber("Min attempts"),
  }),
});

// 2. GET STRONG TOPICS SCHEMA
const getStrongTopicsSchema = z.object({
  query: z.object({
    subjectId: optionalString("Subject ID"),
    limit: optionalNumber("Limit"),
  }),
});

// 3. GET SUBJECT MASTERY DETAILS SCHEMA
const getSubjectMasterySchema = z.object({
  params: z.object({
    subjectId: requiredMongooseId("Subject ID"),
  }),
});

export const userMasteryValidations = {
  getWeakTopicsSchema,
  getStrongTopicsSchema,
  getSubjectMasterySchema,
};

export type TGetWeakTopicsQueryParamsType = z.infer<
  typeof getWeakTopicsSchema.shape.query
>;
export type TGetStrongTopicsQueryParamsType = z.infer<
  typeof getStrongTopicsSchema.shape.query
>;
export type TGetSubjectMasteryParamsType = z.infer<
  typeof getSubjectMasterySchema.shape.params
>;
