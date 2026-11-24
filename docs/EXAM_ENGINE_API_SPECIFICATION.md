# 🚀 Examination Engine - Complete API Specification

এই ডকুমেন্টে **Exam Engine**, **ExamAttempt**, **ExamResult**, **Leaderboard**, **UserMastery** এবং **Bookmark** মডিউলের জন্য প্রয়োজনীয় সকল API-এর পূর্ণাঙ্গ স্পেসিফিকেশন দেওয়া হলো।

---

## 📌 সূচিপত্র
1. [মডিউল ১: ExamAttempt (পরীক্ষা শুরু, লাইভ সেশন ও উত্তরপত্র)](#1-examattempt-apis)
2. [মডিউল ২: ExamResult (ফলাফল, স্কোরকার্ড ও বিষয়ভিত্তিক অ্যানালিটিক্স)](#2-examresult-apis)
3. [মডিউল ৩: Leaderboard (মেধা তালিকা ও র‍্যাংকিং)](#3-leaderboard-apis)
4. [মডিউল ৪: UserMastery (দুর্বলতা ও শক্তির ট্র্যাকার)](#4-usermastery-apis)
5. [মডিউল ৫: Bookmark (রিভিশন ও প্রশ্ন সংরক্ষণ)](#5-bookmark-apis)
6. [মডিউল ৬: Background Workers (শিডিউলার ও ক্রন জব)](#6-background-workers)

---

# 1. ExamAttempt APIs

### ১.১ অফিশিয়াল পরীক্ষা শুরু করা (Start Official Exam)
- **Endpoint:** `POST /api/v1/exam-attempts/start/:examId`
- **Access:** `Student`
- **Purpose:** অ্যাডমিনের তৈরি অফিশিয়াল মডেল টেস্ট বা লাইভ পরীক্ষা শুরু করা।
- **Business Logic & Edge Cases:**
  - পরীক্ষা অবশ্যই `status: "published"` হতে হবে।
  - লাইভ পরীক্ষা হলে `startTime` এবং `endTime` ভ্যালিডেট করা।
  - স্টুডেন্টের যদি এই এক্সামে ইতোমধ্যে মেয়াদযুক্ত `in_progress` সেশন থাকে, তবে নতুন না খুলে সেটি রিটার্ন করবে।
  - `expiresAt = Math.min(startedAt + duration, exam.endTime)`।
  - স্টুডেন্টকে প্রশ্ন পাঠানোর সময় `isCorrect` ও `explanation` স্ট্রিপ (মুছে) পাঠানো হবে।
- **Response (201 Created):**
  ```json
  {
    "success": true,
    "message": "Exam started successfully",
    "data": {
      "attemptId": "673f8a101...",
      "examId": "673f8a1...",
      "title": "46th BCS Special Model Test 01",
      "durationMins": 120,
      "startedAt": "2026-11-20T10:00:00.000Z",
      "expiresAt": "2026-11-20T12:00:00.000Z",
      "totalQuestions": 200,
      "questions": [
        {
          "mappingId": "673fa...",
          "questionId": "673fb...",
          "versionId": "673fc...",
          "questionType": "single_mcq",
          "stem": "বাংলাদেশের সংবিধান কত সালে প্রণীত হয়?",
          "options": [
            { "_id": "opt1...", "content": "১৯৭২" },
            { "_id": "opt2...", "content": "১৯৭১" }
          ]
        }
      ]
    }
  }
  ```

---

### ১.২ সেলফ প্র্যাকটিস কুইজ শুরু করা (Start Self-Practice Quiz)
- **Endpoint:** `POST /api/v1/exam-attempts/self-practice`
- **Access:** `Student`
- **Purpose:** স্টুডেন্ট নিজে ক্যাটাগরি, সাবজেক্ট বা টপিক সিলেক্ট করে কাস্টম কুইজ শুরু করা।
- **Payload:**
  ```json
  {
    "category": "673f...",
    "subject": "673f...",
    "topics": ["673f..."],
    "totalQuestions": 20,
    "durationMins": 20
  }
  ```
- **Business Logic:**
  - ডাটাবেজ থেকে নির্দিষ্ট টপিক/সাবজেক্টের `published` প্রশ্ন দিয়ে `$sample` করে র‍্যান্ডম প্রশ্ন আনা।
  - রিকোয়েস্ট করা সংখ্যার চেয়ে কম প্রশ্ন ডাটাবেজে থাকলে `BadRequest` থ্রো করা।

---

### ১.৩ চলমান পরীক্ষা রিজিউম করা (Resume Active Attempt)
- **Endpoint:** `GET /api/v1/exam-attempts/:id/resume`
- **Access:** `Student` (Owner only)
- **Purpose:** ব্রাউজার রিলোড বা নেটওয়ার্ক বিচ্ছিন্ন হওয়ার পর শিক্ষার্থী পুনরায় তার পরীক্ষা চালু করবে।
- **Business Logic:**
  - সেশন `status: "in_progress"` হতে হবে।
  - যদি `now() > expiresAt` হয়, সাথে সাথে `time_out` হ্যান্ডল করে এক্সপায়ার্ড মেসেজ দেবে।
  - শিক্ষার্থীর ইতোপূর্বে সেভ করা উত্তরগুলো সহ প্রশ্নপত্র ফেরত পাঠাবে।

---

### ১.৪ রিয়েল-টাইম উত্তর সিঙ্ক করা (Sync / Save Answer)
- **Endpoint:** `PATCH /api/v1/exam-attempts/:id/sync-answer`
- **Access:** `Student` (Owner only)
- **Purpose:** পরীক্ষা চলাকালীন শিক্ষার্থী যখনই কোনো উত্তর দেয় বা পরিবর্তন করে, তা সাথে সাথে ডাটাবেজে অটো-সেভ হবে।
- **Payload:**
  ```json
  {
    "mappingId": "673fa...",
    "questionType": "single_mcq",
    "userAnswer": "opt1...",
    "isMarkedForReview": false,
    "timeSpentSeconds": 15
  }
  ```
- **Business Logic:**
  - সময় শেষ হয়ে গেলে উত্তর নেওয়া বন্ধ করবে।
  - সাবডকুমেন্ট ডিসক্রিমিনেটর অনুযায়ী উত্তরের ফরম্যাট ভ্যালিডেট করা।

---

### ১.৫ অ্যান্টি-চিটিং লগ করা (Log Tab Switch)
- **Endpoint:** `POST /api/v1/exam-attempts/:id/log-tab-switch`
- **Access:** `Student` (Owner only)
- **Purpose:** পরীক্ষার্থী ব্রাউজার মিনিমাইজ করলে বা অন্য ট্যাব খুললে চিটিং কাউন্টার বাড়ানো।
- **Business Logic:**
  - `tabSwitchedCount` ১ বৃদ্ধি পাবে।

---

### ১.৬ পরীক্ষা সাবমিট করা (Submit Exam)
- **Endpoint:** `POST /api/v1/exam-attempts/:id/submit`
- **Access:** `Student` (Owner only)
- **Purpose:** পরীক্ষা শেষ করে উত্তরপত্র জমা দেওয়া।
- **Business Logic:**
  - অ্যাটমিক ট্রানজেকশনে `status = "submitted"` হবে।
  - স্বয়ংক্রিয়ভাবে অটোগ্রেডিং হবে এবং **`ExamResult`** তৈরি হবে।
  - ব্যাকগ্রাউন্ডে **`UserMastery`** আপডেট হবে।
- **Response (200 OK):**
  - ফলাফল সামারি (`ExamResult`-এর আইডি সহ)।

---

### ১.৭ শিক্ষার্থীর বিগত পরীক্ষার তালিকা (My Attempts)
- **Endpoint:** `GET /api/v1/exam-attempts/my-attempts`
- **Access:** `Student`
- **Query Params:** `page`, `limit`, `status`, `examId`

---

### ১.৮ পরীক্ষা রিভিউ ও সমাধান দেখা (Review Answer Script)
- **Endpoint:** `GET /api/v1/exam-attempts/:id/review`
- **Access:** `Student` (Owner only), `Admin`
- **Purpose:** পরীক্ষা শেষে প্রতিটি প্রশ্নের সঠিক উত্তর, শিক্ষার্থীর দেওয়া উত্তর এবং ব্যাখ্যা দেখা।
- **Edge Case:**
  - লাইভ পরীক্ষার ক্ষেত্রে যতক্ষণ না পরীক্ষার সময়কাল (`endTime`) শেষ হচ্ছে, ততক্ষণ উত্তরপত্র দেখতে দেওয়া হবে না (প্রশ্ন ফাঁস রোধ)।

---

### ১.৯ অ্যাডমিন অডিট ও ম্যানেজমেন্ট
- **`GET /api/v1/exam-attempts`** (Admin: সকল শিক্ষার্থীর পরীক্ষার তালিকা ও ফিল্টারিং)
- **`GET /api/v1/exam-attempts/:id/audit-details`** (Admin: আইপি, ডিভাইস, ট্যাব সুইচ ও সময় ব্যয়ের পূর্ণ অডিট)
- **`PATCH /api/v1/exam-attempts/:id/cancel`** (Admin: নকল বা অনিয়মের দায়ে পরীক্ষা বাতিল করা)

---

# 2. ExamResult APIs

### ২.১ শিক্ষার্থীর সকল রেজাল্ট কার্ড (My Results)
- **Endpoint:** `GET /api/v1/exam-results/my-results`
- **Access:** `Student`
- **Query Params:** `page`, `limit`, `collectionId`, `isPassed`
- **Data Returned:**
  - প্রতিটি পরীক্ষার স্কোরকার্ড: প্রাপ্ত নম্বর, ভুল উত্তর, শতকরা হার, পাস/ফেল, র‍্যাংক।

### ২.২ নির্দিষ্ট রেজাল্ট কার্ড বিস্তারিত (Result Details with Subject Breakdown)
- **Endpoint:** `GET /api/v1/exam-results/:id`
- **Access:** `Student` (Owner), `Admin`
- **Data Returned:**
  - সামগ্রিক স্কোরের পাশাপাশি বিষয়ভিত্তিক পারফরম্যান্স:
  ```json
  "subjectBreakdown": [
    { "subjectName": "বাংলা", "total": 35, "correct": 28, "wrong": 5, "score": 26.75 },
    { "subjectName": "গণিত", "total": 30, "correct": 12, "wrong": 10, "score": 9.5 }
  ]
  ```

---

# 3. Leaderboard APIs

### ৩.১ পরীক্ষার মেধা তালিকা (Exam Specific Leaderboard)
- **Endpoint:** `GET /api/v1/leaderboard/exam/:examId`
- **Access:** `Public / Student`
- **Query Params:** `limit=100`, `page=1`
- **Data Returned:**
  - শীর্ষ ১০০ শিক্ষার্থীর তালিকা (র‍্যাংক, নাম, প্রোফাইল ছবি, স্কোর, সময় ব্যয়)।
  - শিক্ষার্থীর নিজস্ব অবস্থান (যেমন: "আপনার বর্তমান অবস্থান: ৪৫০ জনের মধ্যে ১৫তম")।
- **Edge Case:** লাইভ পরীক্ষা চলাকালীন এই এন্ডিং ডেডলাইন শেষ না হওয়া পর্যন্ত এটি লক থাকবে।

### ৩.২ ডোমেইন ভিত্তিক সার্বিক লিডারবোর্ড (Collection Leaderboard)
- **Endpoint:** `GET /api/v1/leaderboard/collection/:collectionId`
- **Purpose:** সার্বিক BCS বা Bank প্রিপারেশনের সেরা শিক্ষার্থীদের তালিকা।

---

# 4. UserMastery APIs (Weakness & Strength Tracker)

### ৪.১ সামগ্রিক মাস্টারি ড্যাশবোর্ড (Mastery Overview)
- **Endpoint:** `GET /api/v1/user-mastery/overview`
- **Access:** `Student`
- **Purpose:** শিক্ষার্থী তার সামগ্রিক প্রস্তুতির শতকরা হার ও লেভেল দেখতে পারবে।

### ৪.২ দুর্বল টপিকসমূহ (Weak Topics - বেশি প্র্যাকটিস দরকার)
- **Endpoint:** `GET /api/v1/user-mastery/weak-topics`
- **Access:** `Student`
- **Data Returned:**
  - যেসকল টপিকে শিক্ষার্থীর স্কোর ৬০% এর নিচে:
  ```json
  [
    { "topicName": "বীজগণিত", "subjectName": "গণিত", "accuracy": "35%", "totalAttempted": 40 },
    { "topicName": "আন্তর্জাতিক সংস্থা", "subjectName": "সাধারণ জ্ঞান", "accuracy": "42%", "totalAttempted": 50 }
  ]
  ```

### ৪.৩ শক্তিশালী টপিকসমূহ (Strong Topics)
- **Endpoint:** `GET /api/v1/user-mastery/strong-topics`
- **Access:** `Student`
- **Data Returned:** যেসকল টপিকে শিক্ষার্থীর একিউরেসি ৮০% এর উপরে।

### ৪.৪ বিষয়ভিত্তিক চ্যাপ্টার বিশ্লেষণ (Subject Breakdown)
- **Endpoint:** `GET /api/v1/user-mastery/subject/:subjectId`
- **Access:** `Student`
- **Purpose:** নির্দিষ্ট একটি বিষয়ের কোন কোন চ্যাপ্টারে অগ্রগতি কেমন তা দেখা।

---

# 5. Bookmark APIs (Revision System)

### ৫.১ প্রশ্ন বুকমার্ক করা
- **Endpoint:** `POST /api/v1/bookmarks`
- **Payload:** `{ "questionId": "...", "note": "পুনরায় দেখতে হবে" }`

### ৫.২ বুকমার্ক তালিকা দেখা
- **Endpoint:** `GET /api/v1/bookmarks`
- **Query Params:** `subjectId`, `page`, `limit`

### ৫.৩ বুকমার্ক বাতিল করা
- **Endpoint:** `DELETE /api/v1/bookmarks/:questionId`

---

# 6. Background Workers (Automated Tasks)

### ৬.১ অটো-টাইমআউট ক্রন জব (Auto-Timeout Expired Attempts)
- **Schedule:** প্রতি ১ মিনিট পর পর।
- **Logic:**
  - ডাটাবেজে `status === "in_progress"` এবং `expiresAt < new Date()` খুঁজে বের করবে।
  - তাদের স্ট্যাটাস `time_out` করে দিয়ে স্বয়ংক্রিয়ভাবে খাতা গ্রেডিং ও রেজাল্ট প্রস্তুত করবে।

### ৬.২ লাইভ এক্সাম র‍্যাংক ক্যালকুলেটর (Live Exam Rank Generator)
- **Schedule:** লাইভ এক্সামের `endTime` শেষ হওয়ার সাথে সাথে ট্রিগার হবে।
- **Logic:**
  - টাই-ব্রেকিং নিয়ম (Score > Least Negative > Fastest Time > Submitted Date) মেনে ১ থেকে N পর্যন্ত র‍্যাংক অ্যাসাইন করে রেজাল্ট ডাটাবেজে আপডেট করবে।
