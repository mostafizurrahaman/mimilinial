// ?? Constants
export const userSearchableFields = ["name"] as const;
export const userSortableFields = ["createdAt", "updatedAt"] as const;

export const UserRoles = {
   ADMIN: "admin",
   SUPER_ADMIN: "super_admin",
   USER: "user",
} as const;

export const UserStatus = {
   PENDING: "pending",
   ACTIVE: "active",
   BLOCKED: "blocked",
   DELETED: "deleted",
} as const;

export const AuthProviders = {
   EMAIL: "email",
   GOOGLE: "google",
} as const;

// ?? Export values :
export const userRoleValues = Object.values(UserRoles);
export const userStatusValues = Object.values(UserStatus);
export const authProviderValues = Object.values(AuthProviders);

// ?? Types:
export type TUserSearchableField = (typeof userSearchableFields)[number];
export type TUserSortableField = (typeof userSortableFields)[number];
export type TUserRole = (typeof UserRoles)[keyof typeof UserRoles];
export type TUserStatus = (typeof UserStatus)[keyof typeof UserStatus];
export type TAuthProviderType =
   (typeof AuthProviders)[keyof typeof AuthProviders];
