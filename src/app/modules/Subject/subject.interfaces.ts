import type { TMulterFile } from "@/app/interfaces/multer.types";
import { Document, Types } from "mongoose";

export interface ISubject {
  name_bn: string;
  name_en: string;
  slug: string;
  code: string;
  description?: string | null;
  colorCode: string;
  icon?: string | null;
  sortOrder: number;
  isFeatured: boolean;
  isActive: boolean;
  metaTitle?: string | null;
  metaDescription?: string | null;
  ogImage?: string | null;
  author: Types.ObjectId;
}

export interface ISubjectDoc extends Document, ISubject {}

// #	Method	Endpoint	অ্যাক্সেস	কাজ
// 1	GET	/api/subjects	Public	সাবজেক্ট লিস্ট (লিস্ট পেজ ও ড্রপডাউনের জন্য)
// 2	GET	/api/subjects/:slug	Public	সিঙ্গেল সাবজেক্ট ডিটেইলস ও SEO ডাটা
// 3	GET	/api/admin/subjects	Admin	অ্যাডমিন ডেটা টেবিল লিস্ট
// 4	POST	/api/admin/subjects	Admin	নতুন সাবজেক্ট তৈরি (Create)
// 5	GET	/api/admin/subjects/:id	Admin	সিঙ্গেল সাবজেক্ট ডাটা (Edit Form)
// 6	PUT	/api/admin/subjects/:id	Admin	সাবজেক্ট আপডেট (Update)
// 7	DELETE	/api/admin/subjects/:id	Admin	সাবজেক্ট ডিলিট (Delete)
// 8	PATCH	/api/admin/subjects/reorder	Admin	sortOrder ব্যাচ আপডেট (Drag & Drop)

export interface ISubjectFiles {
  icon: TMulterFile[];
  ogImage: TMulterFile[];
}
