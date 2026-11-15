# 🔍 Codebase Audit & Edge Cases Report (Prostuti-Hub)

> **তারিখ:** ১৫ নভেম্বর ২০২৬  
> **প্রজেক্ট:** Prostuti-Hub Backend Engine (`mimilinial`)  
> **অডিট স্কোপ:** বর্তমান সম্পন্নকৃত সকল মডিউল (`Auth`, `User`, `Otp`, `Category`, `Collection`, `Track`, `Subject`, `Topic`, `Passage`, `PastExam`, `Questions`, `QuestionVersion`, `QuestionMapping`, `Media`)।

---

## 📌 সংক্ষেপ (Executive Summary)

সম্পূর্ণ কোডবেস অডিট করে **৩টি গুরুতর বাগ (Critical Bugs)**, **৫টি ডেটা ইন্টিগ্রিটি ও ক্যাসকেড ডিলিট সমস্যা (Data Integrity & Orphan Risks)** এবং **কয়েকটি কনফিগারেশন/ডিবাগ সমস্যা** শনাক্ত করা হয়েছে।

নিচে বিষয়ভিত্তিক বিস্তারিত বিবরণ, ইমপ্যাক্ট এবং সমাধান দেওয়া হলো:

---

## 🚨 ক্যাটাগরি ১: ক্রিটিক্যাল বাগ (Critical Bugs)

### ১. `Questions` ও `QuestionVersion`: `planStem` বনাম `plainStem` টাইপো বাগ
- **ফাইলের অবস্থান:** [questions.services.ts](file:///c:/Users/Mostafizur%20Rahaman/Desktop/tss_workspace/mimilinial/src/app/modules/Questions/questions.services.ts#L217)
- **সমস্যা:**
  সব ধরণের প্রশ্ন তৈরি ও ভার্সন আপডেটের ১২টি জায়গায় (`createSingleMcqQuestion`, `createMultiMcqQuestion`, `createTrueFalseQuestion`, `createFillBlankQuestion`, `createMatchingQuestion`, `createOrderingQuestion` এবং সকল `update*Question` মেথডে) পেলোডে লেখা হয়েছে:
  ```typescript
  planStem: planHtml, // ❌ ভুল নাম
  ```
  কিন্তু [question-version.model.ts](file:///c:/Users/Mostafizur%20Rahaman/Desktop/tss_workspace/mimilinial/src/app/modules/QuestionVersion/question-version.model.ts#L132)-এ ফিল্ডটির নাম:
  ```typescript
  plainStem: { type: String, required: true, trim: true } // ✅ সঠিক নাম
  ```
- **ইমপ্যাক্ট:** 
  Mongoose স্কিমা স্ট্রিক্ট থাকায় `planStem` বাদ পড়ে যায় এবং ডাটাবেজে `plainStem` ফাঁকা/অনুপস্থিত থাকে। ফলে `QuestionMapping` বা `Questions`-এ যখন `plainStem` দিয়ে টেক্সট সার্চ চালানো হয়, তখন কোনো ফলাফল পাওয়া যায় না।
- **সমাধান:** ১২টি স্থানেই `planStem: planHtml` পরিবর্তন করে `plainStem: planHtml` করতে হবে।

---

### ২. `PastExam`: ডিলিট মেথডে ডেটা ধ্বংসকারী লজিক (Premature Deletion)
- **ফাইলের অবস্থান:** [past-exam.services.ts](file:///c:/Users/Mostafizur%20Rahaman/Desktop/tss_workspace/mimilinial/src/app/modules/PastExam/past-exam.services.ts#L522-L534)
- **কোড:**
  ```typescript
  const deletePastExamById = async (id: string) => {
    const result = await PastExam.findByIdAndDelete(id); // ❌ আগেই ডাটাবেজ থেকে মুছে ফেলা হচ্ছে!

    if (!result) {
      throw new NotFoundError("Past exam not found.");
    }

    if (result.status === EXAM_STATUS.PUBLISHED) { 
      throw new BadRequest("You can not delete an published exam."); // ❌ কিন্তু ডাটা তো অলরেডি ডিলিট!
    }

    return result;
  };
  ```
- **ইমপ্যাক্ট:**
  কোনো পাবলিশড পরীক্ষা ডিলিট করতে চাইলে API ইরর দেয় ঠিকই, কিন্তু পরীক্ষাটি ডাটাবেজ থেকে **ইতিমধ্যেই স্থায়ীভাবে মুছে যায়**! এছাড়া এর সাথে ম্যাপ করা প্রশ্নগুলো ডাটাবেজে এতিম (Orphaned) হয়ে যায়।
- **সমাধান:**
  ডিলিট করার আগে `findById` করে স্ট্যাটাস ও `mappedQuestions > 0` চেক করতে হবে, তারপর `findByIdAndDelete` করতে হবে।

---

### ৩. `QuestionMapping`: ফিল্টারিংয়ে `$or` এবং নাল ভ্যালু ব্লকিং
- **ফাইলের অবস্থান:** [question-mapping.services.ts](file:///c:/Users/Mostafizur%20Rahaman/Desktop/tss_workspace/mimilinial/src/app/modules/QuestionMapping/question-mapping.services.ts#L997-L1041)
- **সমস্যা:**
  - `!includeInActiveQuestion`-এ `$or` ব্যবহার করায় আনপাবলিশড বা ড্রাফট বিষয়ের প্রশ্নও চলে আসছে।
  - `track` এবং `pastExam`-এ `{ track: { $ne: null } }` শর্ত থাকায় যেসব প্রশ্নে ট্র্যাক বা পাস্ট এক্সাম নেই (`null`), সেগুলোকে ব্লক করে দেওয়া হচ্ছে (০ রেজাল্ট আসে)।
  - `pastExamDetails.status: { $ne: EXAM_STATUS.PUBLISHED }` এখনও রয়ে গেছে।
- **সমাধান:**
  ```typescript
  if (!includeInActiveQuestion) {
    pipeline.push({
      $match: {
        "questionDetails.status": QUESTION_STATUS.PUBLISHED,
        "collectionDetails.status": COLLECTION_STATUS.PUBLISHED,
        "categoryDetails.status": categoryStatus.PUBLISHED,
        "subjectDetails.status": SUBJECT_STATUS.PUBLISHED,
        "topicDetails.status": TOPIC_STATUS.PUBLISHED,
        $and: [
          {
            $or: [
              { track: null },
              { "trackDetails.status": trackStatus.PUBLISHED },
            ],
          },
          {
            $or: [
              { pastExam: null },
              { "pastExamDetails.status": EXAM_STATUS.PUBLISHED },
            ],
          },
        ],
      },
    });
  }
  ```

---

## ⚠️ ক্যাটাগরি ২: ডেটা ইন্টিগ্রিটি ও ক্যাসকেড এজ কেস (Cascade & Integrity Risks)

### ৪. সিলেবাস মডেলগুলোতে আনরেস্ট্রিকটেড হার্ড ডিলিট (Cascade Delete Missing)
| মডিউল | মেথড | বর্তমান কোড | এজ কেস ও ঝুঁকি |
|---|---|---|---|
| **`Category`** | `deleteCategoryById` | `Category.findOneAndDelete` | কোনো `Track`, `PastExam` বা `QuestionMapping` আছে কি না চেক করে না। ক্যাটাগরি ডিলিট করলে এর অধীনে থাকা শত শত প্রশ্ন ও ট্র্যাকের রেফারেন্স ভেঙে যায়। |
| **`Subject`** | `deleteSubjectById` | `Subject.findOneAndDelete` | কোনো `Topic` বা `QuestionMapping` আছে কি না চেক করে না। |
| **`Topic`** | `deleteTopicById` | `Topic.findOneAndDelete` | চাইল্ড টপিক চেক করে, কিন্তু `QuestionMapping` চেক করে না। ফলে টপিক ডিলিট হলেও প্রশ্ন ডাটাবেজে ঝুলে থাকে। |
| **`Collection`** | `deleteCollectionById` | `Collection.findOneAndDelete` | আন্ডারলাইং `Category` বা প্রশ্ন চেক করে না। |
| **`Passage`** | `deletePassageById` | `Passage.findOneAndDelete` | কোনো প্রশ্ন এই প্যাসেজটি ব্যবহার করছে কি না চেক না করেই ডিলিট করে দেয়। |

> **প্রস্তাবিত নিয়ম:** কোনো প্যারেন্ট এন্টিটি ডিলিট বা আর্কাইভ করার আগে ডিপেন্ডেন্ট চাইল্ড রেকর্ড (বিশেষ করে `QuestionMapping` ও চাইল্ড ডকুমেন্টস) কাউন্ট করে ব্লক করতে হবে।

---

### ৫. `PastExam`: ক্যাপাসিটি মিসম্যাচ (`totalQuestions` বনাম `mappedQuestions`)
- **ফাইলের অবস্থান:** [past-exam.services.ts](file:///c:/Users/Mostafizur%20Rahaman/Desktop/tss_workspace/mimilinial/src/app/modules/PastExam/past-exam.services.ts#L188-L189)
- **সমস্যা:** 
  এডমিন যখন কোনো PastExam আপডেট করে, তখন `totalQuestions` কমানোর ক্ষেত্রে কোনো চেক নেই।
  - *উদাহরণ:* একটি পরীক্ষায় ইতিমধ্যে ৮০টি প্রশ্ন ম্যাপ করা আছে (`mappedQuestions = 80`)। এডমিন ভুল করে বা ইচ্ছাকৃতভাবে `totalQuestions = 50` দিয়ে আপডেট করল।
  - *ফলাফল:* `mappedQuestions > totalQuestions` হয়ে যায়, যা সিস্টেমের সামগ্রিক ম্যাপিং ভ্যালিডেশনকে অকার্যকর করে দেয়।
- **সমাধান:** 
  `if (payload.totalQuestions !== undefined && payload.totalQuestions < existingExam.mappedQuestions)` হলে `BadRequest` থ্রো করতে হবে।

---

### ৬. `User`: হার্ড ডিলিট বনাম সফট ডিলিট
- **ফাইলের অবস্থান:** [user.services.ts](file:///c:/Users/Mostafizur%20Rahaman/Desktop/tss_workspace/mimilinial/src/app/modules/User/user.services.ts#L198-L207)
- **সমস্যা:**
  `deleteUserById`-এ সরাসরি `User.findOneAndDelete` করা হয়েছে।
- **ঝুঁকি:**
  যদি কোনো এডমিন বা কনটেন্ট ক্রিয়েটরকে ডিলিট করা হয়, তার তৈরি করা শত শত `Question`, `QuestionVersion`, `QuestionMapping`, `PastExam`-এর `author` ফিল্ডে অবাস্তব আইডি থেকে যাবে।
- **সমাধান:**
  সিস্টেমে ইতোমধ্যে `UserStatus.DELETED` রয়েছে। তাই হার্ড ডিলিট না করে `user.status = UserStatus.DELETED` (সফট ডিলিট) করতে হবে।

---

## 🛠️ ক্যাটাগরি ৩: কনফিগারেশন, ডিবাগ ও ছোটখাটো অসঙ্গতি

### ৭. CORS ও Credentials সংঘাত
- **ফাইলের অবস্থান:** [app.ts](file:///c:/Users/Mostafizur%20Rahaman/Desktop/tss_workspace/mimilinial/src/app.ts#L40-L46)
- **সমস্যা:**
  ```typescript
  cors({
    origin: "*",
    credentials: true,
  })
  ```
- **ঝুঁকি:** ব্রাউজারের অফিসিয়াল সিকিউরিটি পলিসি অনুযায়ী `credentials: true` থাকলে `origin: "*"` সম্পূর্ণ নিষিদ্ধ। ব্রাউজার সরাসরি রিকোয়েস্ট ব্লক করে CORS এরর দেখাবে।
- **সমাধান:** ক্লায়েন্ট অরিজিন স্পেসিফিক ডোমেইন অ্যারে হিসেবে কনফিগার করতে হবে।

### ৮. প্রোডাকশন কোডে অপ্রয়োজনীয় `console.log`
- [question-mapping.services.ts (Line 677)](file:///c:/Users/Mostafizur%20Rahaman/Desktop/tss_workspace/mimilinial/src/app/modules/QuestionMapping/question-mapping.services.ts#L677): `console.log(type)`
- [otp.utils.ts (Line 17)](file:///c:/Users/Mostafizur%20Rahaman/Desktop/tss_workspace/mimilinial/src/app/modules/Otp/otp.utils.ts#L17): `console.log({ userId, type, session })`
- [category.services.ts (Line 412)](file:///c:/Users/Mostafizur%20Rahaman/Desktop/tss_workspace/mimilinial/src/app/modules/Category/category.services.ts#L412): `console.log(id)`

### ৯. টেক্সট কপি-পেস্ট টাইপো
- [passage.services.ts (Line 342)](file:///c:/Users/Mostafizur%20Rahaman/Desktop/tss_workspace/mimilinial/src/app/modules/Passage/passage.services.ts#L342): `markAsArchived` মেথডে ড্রাফট প্যাসেজ আর্কাইভ করার এরর মেসেজে লেখা আছে: `"You cannot publish a drafted passage."` (হবে `"You cannot archive a drafted passage."`)।
- [question-mapping.validations.ts (Line 50)](file:///c:/Users/Mostafizur%20Rahaman/Desktop/tss_workspace/mimilinial/src/app/modules/QuestionMapping/question-mapping.validations.ts#L50): `pastExam: requiredMongooseId("Past Exam").optional().optional()` — পরপর দুইবার `.optional()`.

---

## 📋 সংক্ষেপিত চেকলিস্ট (Action Items)

| প্রায়োরিটি | মডিউল | কাজের বিবরণ | স্ট্যাটাস |
|:---:|:---:|---|:---:|
| 🔴 **High** | `Questions` | ১২টি স্থানে `planStem` বদলে `plainStem` করা | Pending |
| 🔴 **High** | `PastExam` | `deletePastExamById`-এ ডিলিট করার পূর্বে স্ট্যাটাস ও ম্যাপিং চেক করা | Pending |
| 🔴 **High** | `QuestionMapping` | `!includeInActiveQuestion` ফিল্টারে `$and` এবং নাল সেফটি নিশ্চিত করা | Pending |
| 🟡 **Medium** | `Category/Subject/Topic` | ডিলিটের পূর্বে চাইল্ড ও ম্যাপিং চেক সংযুক্ত করা | Pending |
| 🟡 **Medium** | `PastExam` | আপডেটের সময় `totalQuestions < mappedQuestions` প্রতিরোধ করা | Pending |
| 🟡 **Medium** | `User` | হার্ড ডিলিটের বদলে সফট ডিলিট (`status: DELETED`) কার্যকর করা | Pending |
| 🟢 **Low** | `Global` | `app.ts`-এ CORS ফিক্স এবং সব অপ্রয়োজনীয় `console.log` ক্লিনআপ করা | Pending |
