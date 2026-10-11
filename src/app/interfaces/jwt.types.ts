import type { JwtPayload } from "jsonwebtoken";
import type { TUserRole, TUserStatus } from "@/app/modules/User";

export interface IJwtUserPayload extends JwtPayload {
  _id: string;
  name: string;
  email: string;
  role: TUserRole;
  profileImage: string;
  status: TUserStatus;
}
