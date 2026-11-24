# 📋 Exam Creation Architecture — Essential Edge Cases & Validation Rules

> **মডিউল:** `Exam` (অফিশিয়াল মডেল টেস্ট তৈরি)  
> **এন্ডপয়েন্ট:** `POST /api/v1/exams`  
> **উদ্দেশ্য:** অ্যাডমিন যখন কোনো নতুন অফিশিয়াল পরীক্ষা বা মডেল টেস্ট তৈরি করবে, তখন ব্যাকএন্ডে যে সমস্ত এজ কেস ও বিজনেস রুলস কঠোরভাবে ভ্যালিডেট করতে হবে।

---

## 🎯 Exam Create করার সময় যে ১৩টি এজ কেস হ্যান্ডেল করতে হবে:

### ১. সিলেবাস কাঠামোর সঙ্গতি ও হায়ারার্কি ভ্যালিডেশন (Hierarchy Belonging)
- **এজ কেস:** অ্যাডমিন `examLevel: "topic"` দিল, কিন্তু `topic` ফিল্ড ফাঁকা রাখল। অথবা এমন একটি `track` বা `topic` দিল যা সিলেক্টেড `category` বা `subject`-এর অধীনে নেই।
- **হ্যান্ডলিং:**
  - `examLevel === "category"` হলে শুধু `category` থাকবে; `track`, `subject`, `topic` অবশ্যই `null` হবে।
  - `examLevel === "track"` হলে `category` ও `track` আবশ্যক; এবং নিশ্চিত করতে হবে `track.category === category._id`।
  - `examLevel === "subject"` হলে `category` ও `subject` আবশ্যক।
  - `examLevel === "topic"` হলে `category`, `subject` ও `topic` আবশ্যক; এবং নিশ্চিত করতে হবে `topic.subject === subject._id`।

---

### ২. ড্রাফট বা আর্কাইভ বিষয়ের অধীনে পরীক্ষা তৈরি রোধ (Inactive Hierarchy Check)
- **এজ কেস:** অ্যাডমিন ভুলবশত এমন একটি `Category` বা `Subject`-এর অধীনে পরীক্ষা তৈরি করতে চাইল যা ড্রাফট অথবা আর্কাইভ অবস্থায় আছে।
- **হ্যান্ডলিং:** হায়ারার্কির প্রতিটি রেফারেন্সড ডকুমেন্ট (`Category`, `Track`, `Subject`, `Topic`) ডাটাবেজে থাকতে হবে এবং তাদের প্রত্যেকের `status === "published"` হতে হবে। অন্যথায় এরর দিতে হবে: `"Cannot create exam under an unpublished category or subject."`

---

### ৩. র‍্যান্ডম মোডে অপর্যাপ্ত প্রশ্ন ভাণ্ডার (Insufficient Question Pool in Random Mode)
- **এজ কেস:** অ্যাডমিন `generationMode: "random"` দিয়ে `totalQuestions: 100` চাইল, কিন্তু নির্বাচিত বিষয় বা টপিকে মাত্র ৩৫টি প্রশ্ন পাবলিশড রয়েছে।
- **হ্যান্ডলিং:** ডাটাবেজে পরীক্ষা সেভ করার আগেই ক্রাইটেরিয়া অনুযায়ী কাউন্ট ক্যোয়ারি চালাতে হবে। যদি `availablePublishedQuestions < totalQuestions` হয়, তবে স্পষ্ট এরর দিয়ে রিকোয়েস্ট রিজেক্ট করতে হবে:
  > *"Only 35 published questions available for this criteria. Cannot generate an exam with 100 questions."*

---

### ৪. ম্যানুয়াল মোডে ডুপ্লিকেট প্রশ্ন ইনপুট (Duplicate Questions in Manual Input)
- **এজ কেস:** অ্যাডমিন ম্যানুয়ালি প্রশ্ন বাছাই করার সময় ভুল করে একই প্রশ্নের ম্যাপিং আইডি দুই বা ততোধিকবার পাঠাল।
- **হ্যান্ডলিং:** পেলোড থেকে `questionMappings` পাওয়ার পর ইউনিক সেট তৈরি করতে হবে:
  ```typescript
  const uniqueMappings = [...new Set(payload.questionMappings)];
  if (uniqueMappings.length !== payload.questionMappings.length) {
    throw new BadRequest("Duplicate question mappings found in the exam.");
  }
  ```

---

### ৫. ম্যানুয়াল মোডে প্রশ্নের সংখ্যা ও তালিকার অমিল (Question Count Mismatch)
- **এজ কেস:** অ্যাডমিন `totalQuestions: 50` উল্লেখ করল, কিন্তু `questionMappings` অ্যারেতে ৪৮টি অথবা ৫৫টি প্রশ্ন পাঠাল।
- **হ্যান্ডলিং:** কঠোরভাবে চেক করতে হবে: `questionMappings.length === totalQuestions`। কম বা বেশি হলে রিকোয়েস্ট রিজেক্ট হবে।

---

### ৬. ম্যানুয়াল মোডে বহিরাগত বা আনপাবলিশড প্রশ্ন সংযুক্তি (Irrelevant or Draft Questions)
- **এজ কেস:** অ্যাডমিন একটি "বাংলা ব্যাকরণ" বিষয়ের মডেল টেস্ট তৈরি করার সময় ভুল করে অন্য বিষয়ের (যেমন: গণিত) প্রশ্ন আইডি অথবা কোনো ড্রাফট/আর্কাইভ প্রশ্নের আইডি পাঠিয়ে দিল।
- **হ্যান্ডলিং:** পাঠানো সকল `questionMappings` আইডি ডাটাবেজে ভ্যালিডেট করতে হবে:
  1. প্রতিটি ম্যাপিং ডাটাবেজে বিদ্যমান কি না।
  2. সংশ্লিষ্ট প্রশ্ন ও উপাদানগুলো `PUBLISHED` কি না।
  3. প্রশ্নগুলো এই পরীক্ষার নির্বাচিত সিলেবাস হায়ারার্কির সাথে সঙ্গতিপূর্ণ কি না।

---

### ৭. পাস মার্ক ও পূর্ণমানের প্যারাডক্স (`passMarks > totalMarks`)
- **এজ কেস:** অ্যাডমিন মোট প্রশ্ন ৫০টি দিয়ে প্রতি প্রশ্নের মান ১ (পূর্ণমান ৫০) নির্ধারণ করল, কিন্তু পাস মার্ক দিল ৬০! ফলে কোনো পরীক্ষার্থীর পক্ষে পাস করা অসম্ভব হয়ে দাঁড়াবে। অথবা `passMarks <= 0` দিল।
- **হ্যান্ডলিং:** ভ্যালিডেশন চেক:
  $$0 < \text{passMarks} \le \text{totalMarks}$$

---

### ৮. টোটাল মার্কের হিসাব গরমিল ও টেম্পারিং (Total Marks Tampering)
- **এজ কেস:** ক্লায়েন্ট পেলোড থেকে ভুলবশত বা ইচ্ছাকৃতভাবে `totalMarks`-এ ভুল হিসাব আসল (যেমন: ১০০টি প্রশ্ন, প্রতিটির মান ০.৫০, কিন্তু `totalMarks` পাঠিয়ে দিল ১০০)।
- **হ্যান্ডলিং:** ক্লায়েন্টের পাঠানো `totalMarks`-এর উপর নির্ভর না করে ব্যাকএন্ডে স্বয়ংক্রিয়ভাবে হিসাব করতে হবে:
  $$\text{totalMarks} = \text{totalQuestions} \times \text{marksPerQuestion}$$
  (দশমিকের ২ ঘর পর্যন্ত রাউন্ডেড)।

---

### ৯. অবাস্তব ও অতিরিক্ত নেগেটিভ মার্কিং (Negative Marks Logic)
- **এজ কেস:** অ্যাডমিন `marksPerQuestion: 1.0` দিল, কিন্তু `negativeMarks: 1.5` দিল (ভুল করলে প্রশ্নের মানের চেয়েও বেশি জরিমানা)। অথবা নেগেটিভ নম্বর হিসেবে `-0.25` ইনপুট দিল।
- **হ্যান্ডলিং:** ভ্যালিডেশন রুল:
  - `negativeMarks` সবসময় ধনাত্মক সংখ্যা বা ০ হতে হবে (`>= 0`)।
  - `negativeMarks < marksPerQuestion` হতে হবে।

---

### ১০. লাইভ পরীক্ষার টাইম-উইন্ডো ও ডিউরেশন প্যারাডক্স (Live Exam Time Conflict)
- **এজ কেস (যদি `examType === "live"` হয়):**
  1. `startTime` বা `endTime` পাঠানো হয়নি (`null`)।
  2. অতীতে চলে যাওয়া কোনো সময়কে `startTime` নির্ধারণ করা (`startTime < new Date()`)।
  3. শুরু হওয়ার আগেই শেষ হওয়ার সময় দেওয়া (`startTime >= endTime`)।
  4. পরীক্ষার মোট উইন্ডোর চেয়ে ডিউরেশন বেশি নির্ধারণ করা (যেমন: উইন্ডো ১০:০০ থেকে ১০:৩০ অর্থাৎ ৩০ মিনিট, কিন্তু ডিউরেশন দিল ৪৫ মিনিট)।
- **হ্যান্ডলিং:**
  - `startTime >= new Date()`
  - `endTime > startTime`
  - `(endTime.getTime() - startTime.getTime()) >= durationMins * 60 * 1000`

---

### ১১. প্র্যাকটিস পরীক্ষার অপ্রয়োজনীয় টাইম ফিল্ড স্যানিটাইজেশন (Practice Exam Sanitization)
- **এজ কেস:** অ্যাডমিন `examType: "practice"` দিল, কিন্তু একই সাথে `startTime` ও `endTime` ইনপুট পাঠাল।
- **হ্যান্ডলিং:** প্র্যাকটিস পরীক্ষা সবসময় এভারগ্রিন ও ওপেন-এন্ডেড। তাই `examType === "practice"` হলে সার্ভার স্বয়ংক্রিয়ভাবে `startTime = null` এবং `endTime = null` সেট করে ডাটা সেভ করবে।

---

### ১২. ইউনিক স্লাগ কলিশন (Slug Collision Handling)
- **এজ কেস:** অ্যাডমিন একই টাইটেলের দুটি পরীক্ষা তৈরি করল (যেমন: `"BCS Model Test 01"`), ফলে স্লাগ তৈরি হলো `"bcs-model-test-01"` যা ডাটাবেজে অলরেডি আছে।
- **হ্যান্ডলিং:** স্লাগ জেনারেশনের সময় ইউনিকনেস চেক করতে হবে। ডুপ্লিকেট পাওয়া গেলে ন্যানোআইডি বা রেন্ডম স্ট্রিং যোগ করে স্লাগ ইউনিক রাখতে হবে (`bcs-model-test-01-k9x2`) অথবা এরর রিটার্ন করতে হবে।

---

### ১৩. অবাস্তব বা শূন্য ভ্যালু ইনপুট রোধ (Boundary Constraints)
- **এজ কেস:** অ্যাডমিন ভুল করে `durationMins: 0`, `totalQuestions: 0`, `marksPerQuestion: 0` দিয়ে পরীক্ষা সেভ করার চেষ্টা করল।
- **হ্যান্ডলিং:** Zod ভ্যালিডেশনে ন্যূনতম বাউন্ডারি নির্ধারণ করতে হবে:
  - `durationMins`: মিনিমাম ১ মিনিট, ম্যাক্সিমাম ৩০০ মিনিট (৫ ঘণ্টা)।
  - `totalQuestions`: মিনিমাম ১টি, ম্যাক্সিমাম ৫০০টি।
  - `marksPerQuestion`: মিনিমাম ০.১০, ম্যাক্সিমাম ১০.০০।
