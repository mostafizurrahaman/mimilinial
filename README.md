# Prostuti App Backend:

### Morgan (Middleware)

- Morgan: Logs incoming http requests into terminal
- Step 1: `npm install morgan`
- Then Setup the morgan middleware:

```js
import morgan from "morgan";
import express from "express";

const app = express();

app.use(
   morgan(":method :url :status :res[content-length] - :response-time ms"),
);

// as morgan first parameter you can pass:
// combined, common, dev, short, tiny and common
// we used custom one.
```

### Helmet:

```js
import helmet from "helmet";
import express from "express";

const app = express();

app.use(helmet());
```

```json
?page=1
&limit=10
&searchTerm=
&sortOrder=
&sortBy=
&fromDate=2026-01-01T00:00:00.000Z
&toDate=2026-12-31T23:59:59.999Z
&status=
&role=
```

```json
page: 1
limit: 10
searchTerm:
sortOrder:
sortBy:
fromDate: 2026-01-01T00:00:00.000Z
toDate: 2026-12-31T23:59:59.999Z
status:
role:

```

```
১. Collection Model
meta_title : string (nullable) — কাস্টম মেটা টাইটেল (যেমন: "BCS Preparation & Question Bank")
meta_description : text (nullable) — সার্চ রেজাল্টের বিবরণী (~155-160 অক্ষর)
og_image_url : string (nullable) — ফেসবুক বা লিঙ্কডইনে শেয়ার করার সোশ্যাল প্রিভিউ ইমেজ
canonical_url : string (nullable) — ডুপ্লিকেট URL সমস্যা এড়াতে
২. Category Model
meta_title : string (nullable) — যেমন: "46th BCS Preliminary Model Tests & Questions"
meta_description : text (nullable)
og_image_url : string (nullable)
canonical_url : string (nullable)
৩. Track Model
meta_title : string (nullable) — যেমন: "Sonali Bank Officer (Cash) Question Bank"
meta_description : text (nullable)
canonical_url : string (nullable)
৪. Subject Model
meta_title : string (nullable) — যেমন: "বাংলা ব্যাকরণ ও সাহিত্য MCQ প্রশ্ন ও প্রস্তুতি"
meta_description : text (nullable)
og_image_url : string (nullable)
canonical_url : string (nullable)
৫. Topic Model
meta_title : string (nullable) — যেমন: "Parts of Speech MCQ Practice & Rules"
meta_description : text (nullable)
canonical_url : string (nullable)
৬. SyllabusNode Model
meta_title : string (nullable) — যেমন: "46th BCS Official Syllabus & Marks Distribution"
meta_description : text (nullable)
৭. Question Model
(শিক্ষার্থীরা গুগলে সরাসরি প্রশ্ন সার্চ করলে দীর্ঘমেয়াদী অর্গানিক ট্রাফিকের জন্য)
slug : string (unique) — প্রশ্নের টাইটেল দিয়ে তৈরি URL (যেমন: /questions/bangladesher-shadhinota-dibos-kobe)
meta_title : string (nullable) — যদি কাস্টম টাইটেল দিতে চান (ডিফল্ট: question stem)
meta_description : text (nullable) — প্রশ্নের সংক্ষিপ্ত বিবরণ ও ব্যাখ্যা
canonical_url : string (nullable) — একই প্রশ্ন একাধিক ক্যাটাগরিতে থাকলে প্রাইমারি লিংক নির্ধারণের জন্য
no_index : boolean (default: false) — ভুল বা বাতিল হওয়া প্রশ্ন গুগলের ইনডেক্স থেকে বাদ রাখতে
৮. Passage Model
(প্যাসেজ, জ্যামিতিক চিত্র, গ্রাফ বা চার্টভিত্তিক প্রশ্নের জন্য)
media_alt : string (nullable) — চিত্র/ডায়াগ্রামের সঠিক বিবরণ (Next.js Image Accessibility এবং Google Image SEO-র জন্য)
media_caption : string (nullable) — ছবির নিচে প্রদর্শনের উপযোগী টেক্সট
৯. ExamInstance Model (Live Exam / Mock Test)
slug : string (unique) — যেমন: /exams/46th-bcs-preli-special-model-test-01
meta_title : string (nullable)
meta_description : text (nullable)
og_image_url : string (nullable) — রেজাল্ট বা এক্সাম শেয়ার কার্ড ব্যানার
canonical_url : string (nullable)
১০. Article Model (Blog / Preparation Guide)
meta_title : string (nullable)
meta_description : text (nullable)
thumbnail_alt : string — আর্টিকেলের থাম্বনেইল ছবির অল্টারনেটিভ টেক্সট
canonical_url : string (nullable)
og_image_url : string (nullable)
no_index : boolean (default: false) — ড্রাফট থাকা অবস্থায় সার্চ ইঞ্জিনে প্রদর্শন বন্ধ রাখতে
১১. JobCircular Model
(গুগলের JobPosting Structured Data Schema তৈরি করতে)
meta_title : string (nullable)
meta_description : text (nullable)
og_image_url : string (nullable)
hiring_organization : string — যেমন: "Bangladesh Bank", "Sonali Bank PLC"
job_location : string — যেমন: "Dhaka, Bangladesh"
employment_type : string — যেমন: FULL_TIME, PART_TIME, CONTRACT
valid_through : datetime — আবেদনের শেষ তারিখ (Google Jobs কার্ডের জন্য বাধ্যতামূলক)
১২. PayScale Model
meta_title : string (nullable) — যেমন: "৯ম গ্রেড বেতন স্কেল, সুবিধা ও দায়িত্বসমূহ"
meta_description : text (nullable)
canonical_url : string (nullable)
```
