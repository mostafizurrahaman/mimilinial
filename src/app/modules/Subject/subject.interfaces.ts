import { Document } from "mongoose";

export interface ISubject {
   name: string;
   slug: string;
   description?: string | null;
}

export interface ISubjectDoc extends Document, ISubject {}
