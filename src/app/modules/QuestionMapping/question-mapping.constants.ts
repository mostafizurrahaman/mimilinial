export const questionMappingSearchableFields = ['name'] as const;
export const questionMappingSortableFields = ['createdAt', 'updatedAt'] as const;

export type TQuestionMappingSearchableField = (typeof questionMappingSearchableFields)[number];
export type TQuestionMappingSortableField = (typeof questionMappingSortableFields)[number];
