export const subjectSearchableFields = ['name'] as const;
export const subjectSortableFields = ['createdAt', 'updatedAt'] as const;

export type TSubjectSearchableField = (typeof subjectSearchableFields)[number];
export type TSubjectSortableField = (typeof subjectSortableFields)[number];
