import { generateSlug } from "@/app/utils";
import { Exam } from "./exam.model";
import type {  IExamDoc } from "./exam.interfaces";
import type { Model } from "mongoose";
import { nanoid} from 'nanoid'




class  ExamUtils  {

    constructor(private readonly ExamModel: Model<IExamDoc>)  {
        this.ExamModel =  ExamModel
    }

    // 1. Generate Unique Exam Slug:
    async generateUniqueExamSlug (title: string): Promise<string>  {
        const initialSlug =  generateSlug(title);
        let slug = initialSlug;

        while (await this.ExamModel.exists({ slug })) {
            slug = `${initialSlug}-${nanoid(6)}`;
        }

        return slug;
    };



}


export  const { generateUniqueExamSlug}  = new ExamUtils(Exam)