import httpStatus from "http-status";
import { UserStatus, type TUserRole } from "@/app/modules/User/user.constants";
import { catchAsync, verifyToken } from "@/app/utils";
import { AppError, ForbiddenError, UnauthorizedError } from "@/app/errors";
import { configs } from "@/app/configs";
import { db } from "@/app/db";
import { users } from "@/app/db/schemas";
import { eq } from "drizzle-orm";

export const auth = (...requiredRoles: TUserRole[]) => {
  return catchAsync(async (req, res, next) => {
    /**
     * 1. Extract access token
     */
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
      throw new UnauthorizedError("Authorization token is missing");
    }

    const token = authHeader.split(" ")[1];

    /**
     * 2. Verify and decode token
     */
    const decoded = verifyToken(
      token as string,
      configs.jwt.accessToken.secret,
    );

    if (!decoded?.email) {
      throw new AppError(httpStatus.UNAUTHORIZED, "Invalid access token");
    }

    /**
     * 3. Fetch user
     */
    const user = await db.query.users.findFirst({
      where: { email: decoded.email },
    });

    if (!user) {
      throw new AppError(httpStatus.NOT_FOUND, "User not found");
    }

    /**
     * 4. Account status checks
     */
    if (user.status === UserStatus.BLOCKED) {
      throw new ForbiddenError("Your account has been blocked");
    }

    if (user.status === UserStatus.DELETED) {
      throw new AppError(httpStatus.GONE, "Your account has been deleted");
    }

    if (!user.isOtpVerified) {
      throw new AppError(httpStatus.FORBIDDEN, "Please verify your account");
    }

    if (user.status !== UserStatus.ACTIVE) {
      throw new AppError(httpStatus.FORBIDDEN, "Your account is not active");
    }

    /**
     * 5. Role-based access control (RBAC)
     */
    if (requiredRoles.length && !requiredRoles.includes(user.role as TUserRole)) {
      throw new AppError(
        httpStatus.FORBIDDEN,
        "You do not have permission to access this resource",
      );
    }

    /**
     * 6. Attach user to request
     */
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (req as any).user = decoded;

    next();
  });
};
