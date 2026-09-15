export const OtpTypes = {
   SIGNUP: "signup",
   RESET: "reset",
} as const;

export const otpTypeValues = Object.values(OtpTypes);

export const otpSearchableFields = ["name"] as const;
export const otpSortableFields = ["createdAt", "updatedAt"] as const;

export type TOtpSearchableField = (typeof otpSearchableFields)[number];
export type TOtpSortableField = (typeof otpSortableFields)[number];

export type TOtpType = (typeof OtpTypes)[keyof typeof OtpTypes];
