import mongoose from "mongoose";
import slugify from "slugify";
import { configs } from "../configs";
import { connectDB } from "../utils/connect-db";
import { logger } from "../utils";
import { sendSuperAdmin } from "./seed-super-admin";
import { User, UserRoles } from "../modules/User";
import { Collection, COLLECTION_STATUS } from "../modules/Collection";
import { Category, categoryStatus } from "../modules/Category";
import { Track, trackStatus } from "../modules/Track";
import { Subject, SUBJECT_STATUS } from "../modules/Subject";
import { Topic, TOPIC_STATUS } from "../modules/Topic";
import { PastExam, EXAM_STATUS } from "../modules/PastExam";
import { Passage, PASSAGE_STATUS } from "../modules/Passage";
import {
  Question,
  QUESTION_DIFFICULTY,
  QUESTION_STATUS,
  QUESTION_TYPE,
} from "../modules/Questions";
import { SingleMcqVersion } from "../modules/QuestionVersion";
import { QuestionMapping } from "../modules/QuestionMapping";

const createSlug = (text: string) =>
  slugify(text, { lower: true, strict: true, trim: true }) ||
  text.toLowerCase().replace(/[^a-z0-9]+/g, "-");

export const seedSampleData = async () => {
  logger.info("🌱 Starting Comprehensive Seed Process...");

  // 1. Ensure Super Admin exists to be author
  await sendSuperAdmin();
  const superAdmin = await User.findOne({ role: UserRoles.SUPER_ADMIN });
  if (!superAdmin) {
    throw new Error("Super admin user could not be found or created.");
  }
  const authorId = superAdmin._id;

  // Clear existing sample collections, questions and mappings to prevent unique index conflicts
  logger.info("🧹 Cleaning up existing data...");
  await Promise.all([
    QuestionMapping.deleteMany({}),
    SingleMcqVersion.deleteMany({}),
    Question.deleteMany({}),
    Passage.deleteMany({}),
    PastExam.deleteMany({}),
    Topic.deleteMany({}),
    Subject.deleteMany({}),
    Track.deleteMany({}),
    Category.deleteMany({}),
    Collection.deleteMany({}),
  ]);

  // ==========================================
  // 1. CREATE 3 COLLECTIONS
  // ==========================================
  logger.info("📦 Creating 3 Collections...");
  const collectionsData = [
    {
      nameEn: "BCS Preparation",
      nameBn: "বিসিএস প্রস্তুতি",
      slug: "bcs-preparation",
      description: "Comprehensive preparation resources for Bangladesh Civil Service examinations.",
      icon: "https://images.unsplash.com/photo-1434030216411-0b793f4b4173",
      status: COLLECTION_STATUS.PUBLISHED,
      publishedAt: new Date(),
      author: authorId,
    },
    {
      nameEn: "Government Job Preparation",
      nameBn: "সরকারি চাকরি প্রস্তুতি",
      slug: "govt-job-preparation",
      description: "Preparation for Primary, Bank, NTRCA, and other autonomous government recruitments.",
      icon: "https://images.unsplash.com/photo-1454165804606-c3d57bc86b40",
      status: COLLECTION_STATUS.PUBLISHED,
      publishedAt: new Date(),
      author: authorId,
    },
    {
      nameEn: "University Admission",
      nameBn: "বিশ্ববিদ্যালয় ভর্তি প্রস্তুতি",
      slug: "university-admission",
      description: "Preparation materials for Engineering, Medical, and General Public University Admission tests.",
      icon: "https://images.unsplash.com/photo-1523240795612-9a054b0db644",
      status: COLLECTION_STATUS.PUBLISHED,
      publishedAt: new Date(),
      author: authorId,
    },
  ];

  const createdCollections = await Collection.insertMany(collectionsData);
  logger.info(`✅ Created ${createdCollections.length} Collections.`);

  // ==========================================
  // 2. CREATE 3 CATEGORIES FOR EACH COLLECTION (Total = 9)
  // ==========================================
  logger.info("📑 Creating 3 Categories for each Collection (9 total)...");
  const categoriesRaw = [
    // Collection 0: BCS
    [
      { nameEn: "46th bcs preliminary", nameBn: "৪৬তম বিসিএস প্রিলিমিনারি", slug: "46th-bcs-preli" },
      { nameEn: "45th bcs preliminary", nameBn: "৪৫তম বিসিএস প্রিলিমিনারি", slug: "45th-bcs-preli" },
      { nameEn: "bcs special cadre", nameBn: "বিসিএস বিশেষ ক্যাডার প্রস্তুতি", slug: "bcs-special-cadre" },
    ],
    // Collection 1: Govt Jobs
    [
      { nameEn: "bank recruitment", nameBn: "ব্যাংক নিয়োগ পরীক্ষা", slug: "bank-recruitment" },
      { nameEn: "primary assistant teacher", nameBn: "প্রাথমিক সহকারী শিক্ষক নিয়োগ", slug: "primary-teacher" },
      { nameEn: "ntrca teacher registration", nameBn: "এনটিআরসিএ শিক্ষক নিবন্ধন", slug: "ntrca-registration" },
    ],
    // Collection 2: Admission
    [
      { nameEn: "engineering admission", nameBn: "প্রকৌশল বিশ্ববিদ্যালয় ভর্তি", slug: "engineering-admission" },
      { nameEn: "medical admission", nameBn: "মেডিকেল ভর্তি পরীক্ষা", slug: "medical-admission" },
      { nameEn: "general and gst admission", nameBn: "সাধারণ ও গুচ্ছ বিশ্ববিদ্যালয় ভর্তি", slug: "gst-admission" },
    ],
  ];

  const createdCategories: any[] = [];
  for (let i = 0; i < createdCollections.length; i++) {
    const coll = createdCollections[i]!;
    const catGroup = categoriesRaw[i] || [];
    for (const cat of catGroup) {
      const createdCat = await Category.create({
        collectionId: coll._id,
        nameEn: cat.nameEn,
        nameBn: cat.nameBn,
        slug: cat.slug,
        description: `${cat.nameBn} এর সম্পূর্ণ প্রস্তুতি ও বিগত বছরের প্রশ্ন ব্যাংক।`,
        status: categoryStatus.PUBLISHED,
        publishedAt: new Date(),
        author: authorId,
      });
      createdCategories.push(createdCat);
    }
  }
  logger.info(`✅ Created ${createdCategories.length} Categories.`);

  // ==========================================
  // 3. CREATE 2 TRACKS FOR EACH CATEGORY (Total = 18)
  // ==========================================
  logger.info("🛤️ Creating 2 Tracks for each Category (18 total)...");
  const createdTracks: any[] = [];
  for (const cat of createdCategories) {
    const track1 = await Track.create({
      category: cat._id,
      nameEn: `${cat.nameEn} general track`,
      nameBn: `${cat.nameBn} - সাধারণ ট্র্যাক`,
      slug: createSlug(`${cat.slug}-general-track`),
      description: "General comprehensive study track",
      status: trackStatus.PUBLISHED,
      publishedAt: new Date(),
      author: authorId,
    });

    const track2 = await Track.create({
      category: cat._id,
      nameEn: `${cat.nameEn} advance track`,
      nameBn: `${cat.nameBn} - অ্যাডভান্স ট্র্যাক`,
      slug: createSlug(`${cat.slug}-advance-track`),
      description: "Advanced model test & revision track",
      status: trackStatus.PUBLISHED,
      publishedAt: new Date(),
      author: authorId,
    });

    createdTracks.push(track1, track2);
  }
  logger.info(`✅ Created ${createdTracks.length} Tracks.`);

  // ==========================================
  // 4. CREATE 5 SUBJECTS
  // ==========================================
  logger.info("📚 Creating 5 Subjects...");
  const subjectsData = [
    {
      nameBn: "বাংলা ভাষা ও সাহিত্য",
      nameEn: "Bangla Language & Literature",
      slug: "bangla-language-literature",
      code: "BAN-101",
      description: "Comprehensive coverage of Bangla Grammar, Ancient, Medieval & Modern Literature.",
      colorCode: "#EF4444",
      sortOrder: 1,
      isFeatured: true,
      status: SUBJECT_STATUS.PUBLISHED,
      publishedAt: new Date(),
      author: authorId,
    },
    {
      nameBn: "ইংরেজি ভাষা ও সাহিত্য",
      nameEn: "English Language & Literature",
      slug: "english-language-literature",
      code: "ENG-102",
      description: "Parts of speech, idioms, vocabulary, and English literary periods.",
      colorCode: "#3B82F6",
      sortOrder: 2,
      isFeatured: true,
      status: SUBJECT_STATUS.PUBLISHED,
      publishedAt: new Date(),
      author: authorId,
    },
    {
      nameBn: "সাধারণ গণিত ও মানসিক দক্ষতা",
      nameEn: "General Mathematics & Mental Ability",
      slug: "general-math-mental-ability",
      code: "MATH-103",
      description: "Arithmetic, Algebra, Geometry, and analytical reasoning questions.",
      colorCode: "#10B981",
      sortOrder: 3,
      isFeatured: true,
      status: SUBJECT_STATUS.PUBLISHED,
      publishedAt: new Date(),
      author: authorId,
    },
    {
      nameBn: "বাংলাদেশ ও আন্তর্জাতিক বিষয়াবলি",
      nameEn: "Bangladesh & International Affairs",
      slug: "bangladesh-international-affairs",
      code: "GK-104",
      description: "History, Constitution, Geography, and Global geopolitics.",
      colorCode: "#F59E0B",
      sortOrder: 4,
      isFeatured: true,
      status: SUBJECT_STATUS.PUBLISHED,
      publishedAt: new Date(),
      author: authorId,
    },
    {
      nameBn: "সাধারণ বিজ্ঞান ও তথ্যপ্রযুক্তি",
      nameEn: "General Science & ICT",
      slug: "general-science-ict",
      code: "SCI-105",
      description: "Everyday science, Computer Fundamentals, and modern Information Technology.",
      colorCode: "#8B5CF6",
      sortOrder: 5,
      isFeatured: true,
      status: SUBJECT_STATUS.PUBLISHED,
      publishedAt: new Date(),
      author: authorId,
    },
  ];

  const createdSubjects = await Subject.insertMany(subjectsData);
  logger.info(`✅ Created ${createdSubjects.length} Subjects.`);

  // ==========================================
  // 5. CREATE TOPICS WITH 3-LEVEL DEPTH
  // 2 Root topics per subject
  // Each root topic has 2 subtopics
  // Each subtopic has 2 sub-subtopics
  // Total topics = 5 * (2 + 4 + 8) = 70 topics
  // ==========================================
  logger.info("🌲 Creating Nested Topics (Depth 1, 2, 3)...");
  const topicSeedsBySubject: Record<string, { nameBn: string; nameEn: string; subtopics: { nameBn: string; nameEn: string; subSubtopics: { nameBn: string; nameEn: string }[] }[] }[]> = {
    "BAN-101": [
      {
        nameBn: "বাংলা ব্যাকরণ",
        nameEn: "Bangla Grammar",
        subtopics: [
          {
            nameBn: "ধ্বনি ও বর্ণ প্রকরণ",
            nameEn: "Phonology & Letters",
            subSubtopics: [
              { nameBn: "স্বরধ্বনি ও ব্যঞ্জনধ্বনি", nameEn: "Vowels and Consonants" },
              { nameBn: "ণ-ত্ব ও ষ-ত্ব বিধান", nameEn: "Natwa and Satwa Bidhan" },
            ],
          },
          {
            nameBn: "শব্দ ও পদ প্রকরণ",
            nameEn: "Morphology & Parts of Speech",
            subSubtopics: [
              { nameBn: "সন্ধি ও সমাস", nameEn: "Sandhi and Samas" },
              { nameBn: "উপসর্গ ও অনুসর্গ", nameEn: "Prefix and Suffix" },
            ],
          },
        ],
      },
      {
        nameBn: "বাংলা সাহিত্য",
        nameEn: "Bangla Literature",
        subtopics: [
          {
            nameBn: "প্রাচীন ও মধ্যযুগ",
            nameEn: "Ancient & Medieval Era",
            subSubtopics: [
              { nameBn: "চর্যাপদ ও মঙ্গলকাব্য", nameEn: "Charyapada and Mangalkavya" },
              { nameBn: "শ্রীকৃষ্ণকীর্তন ও বৈষ্ণব পদাবলি", nameEn: "Srikrishnakirtana & Vaishnava" },
            ],
          },
          {
            nameBn: "আধুনিক যুগ",
            nameEn: "Modern Literature",
            subSubtopics: [
              { nameBn: "রবীন্দ্রনাথ ঠাকুর ও কাজী নজরুল ইসলাম", nameEn: "Tagore and Nazrul Studies" },
              { nameBn: "মুক্তিযুদ্ধভিত্তিক উপন্যাস ও নাটক", nameEn: "Liberation War Literature" },
            ],
          },
        ],
      },
    ],
    "ENG-102": [
      {
        nameBn: "English Grammar",
        nameEn: "English Grammar",
        subtopics: [
          {
            nameBn: "Parts of Speech",
            nameEn: "Parts of Speech",
            subSubtopics: [
              { nameBn: "Nouns & Pronouns", nameEn: "Nouns and Pronouns" },
              { nameBn: "Verbs & Modals", nameEn: "Verbs and Modals" },
            ],
          },
          {
            nameBn: "Sentence & Clauses",
            nameEn: "Sentence & Clauses",
            subSubtopics: [
              { nameBn: "Subject-Verb Agreement", nameEn: "Subject-Verb Agreement" },
              { nameBn: "Conditionals & Transformation", nameEn: "Conditionals & Transformation" },
            ],
          },
        ],
      },
      {
        nameBn: "English Literature",
        nameEn: "English Literature",
        subtopics: [
          {
            nameBn: "Elizabethan & Romantic Period",
            nameEn: "Elizabethan & Romantic Period",
            subSubtopics: [
              { nameBn: "Shakespeare & Contemporaries", nameEn: "Shakespeare & Contemporaries" },
              { nameBn: "Wordsworth & Keats", nameEn: "Wordsworth & Keats" },
            ],
          },
          {
            nameBn: "Victorian & Modern Age",
            nameEn: "Victorian & Modern Age",
            subSubtopics: [
              { nameBn: "Charles Dickens & Hardy", nameEn: "Charles Dickens & Hardy" },
              { nameBn: "T.S. Eliot & Modern Poets", nameEn: "T.S. Eliot & Modern Poets" },
            ],
          },
        ],
      },
    ],
    "MATH-103": [
      {
        nameBn: "পাটিগণিত ও বীজগণিত",
        nameEn: "Arithmetic & Algebra",
        subtopics: [
          {
            nameBn: "পাটিগণিতের মৌলিক বিষয়",
            nameEn: "Basic Arithmetic",
            subSubtopics: [
              { nameBn: "ঐকিক নিয়ম, শতকরা ও লাভ-ক্ষতি", nameEn: "Unitary Method, Percentage, Profit-Loss" },
              { nameBn: "অনুপাত, সমানুপাত ও সুদকষা", nameEn: "Ratio, Proportion & Interest" },
            ],
          },
          {
            nameBn: "বীজগণিতীয় সূত্রাবলি ও উৎপাদক",
            nameEn: "Algebraic Formulae & Factors",
            subSubtopics: [
              { nameBn: "বীজগণিতীয় রাশি ও মান নির্ণয়", nameEn: "Algebraic Expressions & Values" },
              { nameBn: "সূচক, লগারিদম ও ধারা", nameEn: "Indices, Logarithm & Series" },
            ],
          },
        ],
      },
      {
        nameBn: "জ্যামিতি ও মানসিক দক্ষতা",
        nameEn: "Geometry & Mental Ability",
        subtopics: [
          {
            nameBn: "জ্যামিতির প্রাথমিক ধারণা",
            nameEn: "Basic Geometry",
            subSubtopics: [
              { nameBn: "রেখা, কোণ, ত্রিভুজ ও চতুর্ভুজ", nameEn: "Lines, Angles, Triangles, Quadrilaterals" },
              { nameBn: "বৃত্ত ও পরিমিতি", nameEn: "Circle & Mensuration" },
            ],
          },
          {
            nameBn: "মানসিক দক্ষতা ও যুক্তি",
            nameEn: "Mental Ability & Reasoning",
            subSubtopics: [
              { nameBn: "গাণিতিক যুক্তি ও সংখ্যা শ্রেণি", nameEn: "Mathematical Reasoning & Number Series" },
              { nameBn: "দিক ও সম্পর্ক নির্ণয়", nameEn: "Direction & Relationship Assessment" },
            ],
          },
        ],
      },
    ],
    "GK-104": [
      {
        nameBn: "বাংলাদেশ বিষয়াবলি",
        nameEn: "Bangladesh Affairs",
        subtopics: [
          {
            nameBn: "ইতিহাস ও মুক্তিযুদ্ধ",
            nameEn: "History & Liberation War",
            subSubtopics: [
              { nameBn: "ভাষা আন্দোলন ও ছয় দফা", nameEn: "Language Movement & 6 Points" },
              { nameBn: "১৯৭১ সালের মুক্তিযুদ্ধ ও সংবিধান", nameEn: "1971 War of Independence & Constitution" },
            ],
          },
          {
            nameBn: "ভূগোল, অর্থনীতি ও উন্নয়ন",
            nameEn: "Geography, Economy & Development",
            subSubtopics: [
              { nameBn: "বাংলাদেশের ভূপ্রকৃতি ও নদ-নদী", nameEn: "Geography & River Systems" },
              { nameBn: "মেগা প্রকল্প ও জাতীয় বাজেট", nameEn: "Mega Projects & National Budget" },
            ],
          },
        ],
      },
      {
        nameBn: "আন্তর্জাতিক বিষয়াবলি",
        nameEn: "International Affairs",
        subtopics: [
          {
            nameBn: "আন্তর্জাতিক সংস্থা ও সম্মেলন",
            nameEn: "International Organizations",
            subSubtopics: [
              { nameBn: "জাতিসংঘ ও নিরাপত্তা পরিষদ", nameEn: "United Nations & Security Council" },
              { nameBn: "বিশ্বব্যাংক, আইএমএফ ও এডিবি", nameEn: "World Bank, IMF & ADB" },
            ],
          },
          {
            nameBn: "বিশ্ব রাজনীতি ও চুক্তি",
            nameEn: "Global Geopolitics & Treaties",
            subSubtopics: [
              { nameBn: "পরিবেশ চুক্তি ও জলবায়ু সম্মেলন", nameEn: "Environmental Treaties & COP" },
              { nameBn: "আন্তর্জাতিক বিরোধ ও বর্তমান যুদ্ধসমূহ", nameEn: "Global Conflicts & Current Wars" },
            ],
          },
        ],
      },
    ],
    "SCI-105": [
      {
        nameBn: "সাধারণ বিজ্ঞান",
        nameEn: "General Science",
        subtopics: [
          {
            nameBn: "ভৌত বিজ্ঞান",
            nameEn: "Physical Science",
            subSubtopics: [
              { nameBn: "পদার্থের অবস্থা ও পরমাণুর গঠন", nameEn: "States of Matter & Atomic Structure" },
              { nameBn: "আলো, শব্দ ও চুম্বকত্ব", nameEn: "Light, Sound and Magnetism" },
            ],
          },
          {
            nameBn: "জীববিজ্ঞান ও পরিবেশ",
            nameEn: "Biology & Environment",
            subSubtopics: [
              { nameBn: "কোষের গঠন ও মানব শারীরতত্ত্ব", nameEn: "Cell Structure & Human Anatomy" },
              { nameBn: "খাদ্য, পুষ্টি ও ভিটামিন", nameEn: "Food, Nutrition & Vitamins" },
            ],
          },
        ],
      },
      {
        nameBn: "তথ্য ও যোগাযোগ প্রযুক্তি",
        nameEn: "Information & Communication Technology",
        subtopics: [
          {
            nameBn: "কম্পিউটার হার্ডওয়্যার ও নেটওয়ার্ক",
            nameEn: "Computer Hardware & Network",
            subSubtopics: [
              { nameBn: "সিপিইউ, মেমোরি ও ইনপুট/আউটপুট", nameEn: "CPU, Memory & I/O Devices" },
              { nameBn: "ইন্টারনেট, আইপি অ্যাড্রেস ও ক্লাউড", nameEn: "Internet, IP & Cloud Computing" },
            ],
          },
          {
            nameBn: "সাইবার নিরাপত্তা ও আধুনিক প্রযুক্তি",
            nameEn: "Cyber Security & Modern Tech",
            subSubtopics: [
              { nameBn: "ম্যালওয়্যার, ফায়ারওয়াল ও এনক্রিপশন", nameEn: "Malware, Firewall & Encryption" },
              { nameBn: "কৃত্রিম বুদ্ধিমত্তা ও রোবটিক্স", nameEn: "Artificial Intelligence & Robotics" },
            ],
          },
        ],
      },
    ],
  };

  const createdTopics: any[] = [];
  for (const subject of createdSubjects) {
    const rootSeeds = topicSeedsBySubject[subject.code] || [];
    for (const root of rootSeeds) {
      // Depth 1
      const rootTopic = await Topic.create({
        subject: subject._id,
        parentTopic: null,
        nameBn: root.nameBn,
        nameEn: root.nameEn,
        slug: createSlug(`${subject.code}-${root.nameEn}`),
        depth: 1,
        sortOrder: 1,
        status: TOPIC_STATUS.PUBLISHED,
        publishedAt: new Date(),
        author: authorId,
      });
      createdTopics.push(rootTopic);

      for (const sub of root.subtopics) {
        // Depth 2
        const subTopic = await Topic.create({
          subject: subject._id,
          parentTopic: rootTopic._id,
          nameBn: sub.nameBn,
          nameEn: sub.nameEn,
          slug: createSlug(`${rootTopic.slug}-${sub.nameEn}`),
          depth: 2,
          sortOrder: 1,
          status: TOPIC_STATUS.PUBLISHED,
          publishedAt: new Date(),
          author: authorId,
        });
        createdTopics.push(subTopic);

        for (const leaf of sub.subSubtopics) {
          // Depth 3
          const subSubTopic = await Topic.create({
            subject: subject._id,
            parentTopic: subTopic._id,
            nameBn: leaf.nameBn,
            nameEn: leaf.nameEn,
            slug: createSlug(`${subTopic.slug}-${leaf.nameEn}`),
            depth: 3,
            sortOrder: 1,
            status: TOPIC_STATUS.PUBLISHED,
            publishedAt: new Date(),
            author: authorId,
          });
          createdTopics.push(subSubTopic);
        }
      }
    }
  }
  logger.info(`✅ Created ${createdTopics.length} Topics across 3 depths.`);

  // ==========================================
  // 6. CREATE PAST EXAMS & PASSAGES
  // ==========================================
  logger.info("📄 Creating Passages and Past Exams...");

  const passagesData = [
    {
      titleEn: "The Spirit of the Liberation War",
      titleBn: "মুক্তিযুদ্ধের চেতনা ও বাঙালির আত্মপরিচয়",
      slug: "spirit-of-liberation-war-1971",
      bodyBn:
        "১৯৭১ সালের মুক্তিযুদ্ধ বাঙালির জাতীয় জীবনের সর্বশ্রেষ্ঠ গৌরবময় অধ্যায়। দীর্ঘ শোষণ, বঞ্চনা ও বৈষম্যের অবসান ঘটাতে জাতির পিতা বঙ্গবন্ধু শেখ মুজিবুর রহমানের আহ্বানে বাংলার আপামর জনসাধারণ মুক্তিযুদ্ধে ঝাঁপিয়ে পড়েছিল। ৩০ লক্ষ শহীদের রক্ত এবং ২ লক্ষ মা-বোনের সম্ভ্রমের বিনিময়ে অর্জিত হয়েছে আমাদের স্বাধীনতা। এই স্বাধীনতা রক্ষা করা এবং একটি বৈষম্যহীন, শোষণমুক্ত বাংলাদেশ গড়ে তোলাই আমাদের মুক্তিযুদ্ধের মূল চেতনা।",
      bodyEn:
        "The War of Liberation in 1971 is the most glorious chapter in the national history of the Bengali nation. Responding to the clarion call of the Father of the Nation Bangabandhu Sheikh Mujibur Rahman, people from all walks of life took part in the war to eradicate exploitation and discrimination. At the cost of thirty lac martyrs and two lac dishonored women, our independence was achieved. Safeguarding this sovereignty and forging an egalitarian society remains the paramount ethos of 1971.",
      status: PASSAGE_STATUS.PUBLISHED,
      publishedAt: new Date(),
      author: authorId,
    },
    {
      titleEn: "Artificial Intelligence in Everyday Life",
      titleBn: "দৈনন্দিন জীবনে কৃত্রিম বুদ্ধিমত্তা",
      slug: "artificial-intelligence-everyday-life",
      bodyBn:
        "কৃত্রিম বুদ্ধিমত্তা (AI) বর্তমান বিশ্বের প্রযুক্তির রূপান্তরকারী শক্তি। এটি কম্পিউটার বা যন্ত্রকে মানুষের মতো চিন্তা করার, তথ্য বিশ্লেষণ করার এবং স্বয়ংক্রিয়ভাবে সিদ্ধান্ত নেওয়ার সক্ষমতা দেয়। চিকিৎসা ক্ষেত্রে রোগ নির্ণয়, যানবাহনে স্বচালিত প্রযুক্তি এবং স্মার্টফোনের ভয়েস অ্যাসিস্ট্যান্ট সবক্ষেত্রেই এখন এআই অপরিহার্য উপাদান হয়ে উঠেছে।",
      bodyEn:
        "Artificial Intelligence (AI) has emerged as a transformative force in contemporary technology. It enables machines to mimic human cognition, analyze vast amounts of data, and make autonomous decisions. From diagnostic precision in healthcare to autonomous driving and voice assistants, AI is reshaping modern life.",
      status: PASSAGE_STATUS.PUBLISHED,
      publishedAt: new Date(),
      author: authorId,
    },
    {
      titleEn: "Climate Change and Sustainable Development",
      titleBn: "জলবায়ু পরিবর্তন ও টেকসই উন্নয়ন",
      slug: "climate-change-sustainable-development",
      bodyBn:
        "বিশ্বব্যাপী উষ্ণায়ন এবং বৈরী আবহাওয়ার প্রভাবে আজ জীববৈচিত্র্য হুমকির সম্মুখীন। বাংলাদেশ ভৌগোলিক অবস্থানের কারণে জলবায়ু পরিবর্তনের অন্যতম ঝুঁকিপূর্ণ দেশ। সমুদ্রপৃষ্ঠের উচ্চতা বৃদ্ধি এবং তীব্র প্রাকৃতিক দুর্যোগ এড়াতে কার্বন নিঃসরণ হ্রাস এবং নবায়নযোগ্য শক্তির ব্যবহার বাড়ানো এখন সময়ের দাবি।",
      bodyEn:
        "Global warming and unpredictable weather extremes pose an unprecedented threat to global biodiversity. Due to its unique deltaic topography, Bangladesh is exceptionally vulnerable to climate hazards. Mitigating carbon emissions and embracing green energy are indispensable prerequisites for sustainable survival.",
      status: PASSAGE_STATUS.PUBLISHED,
      publishedAt: new Date(),
      author: authorId,
    },
  ];

  const createdPassages = await Passage.insertMany(passagesData);
  logger.info(`✅ Created ${createdPassages.length} Passages.`);

  // Create Past Exams associated with Categories and Tracks
  const pastExamsData = [
    {
      category: createdCategories[0]._id, // 46th BCS
      track: createdTracks[0]._id,
      nameBn: "৪৬তম বিসিএস প্রিলিমিনারি মডেল টেস্ট ২০২৪",
      nameEn: "46th BCS Preliminary Model Test 2024",
      slug: "46th-bcs-preliminary-2024",
      year: "2024",
      description: "Standard model exam based on the latest BPSC syllabus.",
      totalQuestions: 20,
      mappedQuestions: 0,
      status: EXAM_STATUS.PUBLISHED,
      durationMins: 120,
      publishedAt: new Date(),
      author: authorId,
    },
    {
      category: createdCategories[1]._id, // 45th BCS
      track: createdTracks[2]._id,
      nameBn: "৪৫তম বিসিএস প্রিলিমিনারি প্রশ্ন সমাধান ২০২৩",
      nameEn: "45th BCS Preliminary Actual Exam 2023",
      slug: "45th-bcs-preliminary-actual-2023",
      year: "2023",
      description: "Official 45th BCS preliminary question bank.",
      totalQuestions: 15,
      mappedQuestions: 0,
      status: EXAM_STATUS.PUBLISHED,
      durationMins: 120,
      publishedAt: new Date(),
      author: authorId,
    },
    {
      category: createdCategories[3]._id, // Bank Recruitment
      track: createdTracks[6]._id,
      nameBn: "বাংলাদেশ ব্যাংক সহকারী পরিচালক নিয়োগ পরীক্ষা ২০২৩",
      nameEn: "Bangladesh Bank Assistant Director Exam 2023",
      slug: "bangladesh-bank-ad-2023",
      year: "2023",
      description: "Bankers Selection Committee Secretariat official exam question paper.",
      totalQuestions: 15,
      mappedQuestions: 0,
      status: EXAM_STATUS.PUBLISHED,
      durationMins: 60,
      publishedAt: new Date(),
      author: authorId,
    },
  ];

  const createdPastExams = await PastExam.insertMany(pastExamsData);
  logger.info(`✅ Created ${createdPastExams.length} Past Exams.`);

  // ==========================================
  // 7. CREATE 50 QUESTIONS & VERSIONS
  // ==========================================
  logger.info("❓ Creating 50 Authentic Questions & Single MCQ Versions...");

  // We define 50 realistic questions across 5 subjects (10 per subject)
  const questionBlueprints = [
    // --- BANGLA (1-10) ---
    {
      subjectCode: "BAN-101",
      stem: "চর্যাপদের সবচেয়ে বেশি পদ কে রচনা করেছেন?",
      plainStem: "চর্যাপদের সবচেয়ে বেশি পদ কে রচনা করেছেন?",
      explanation: "চর্যাপদে মোট ৪৬.৫টি পদ পাওয়া গেছে। এর মধ্যে কাহ্নপা সর্বোচ্চ ১৩টি পদ রচনা করেছেন।",
      difficulty: QUESTION_DIFFICULTY.EASY,
      options: [
        { sortOrder: 1, content: "লুইপা", isCorrect: false },
        { sortOrder: 2, content: "কাহ্নপা", isCorrect: true },
        { sortOrder: 3, content: "ভুসুকুপা", isCorrect: false },
        { sortOrder: 4, content: "শবরপা", isCorrect: false },
      ],
    },
    {
      subjectCode: "BAN-101",
      stem: "বাংলা ভাষায় রচিত প্রথম মৌলিক নাটক কোনটি?",
      plainStem: "বাংলা ভাষায় রচিত প্রথম মৌলিক নাটক কোনটি?",
      explanation: "তারাচরণ শিকদার রচিত 'ভদ্রার্জুন' (১৮৫২) বাংলা ভাষার প্রথম মৌলিক নাটক।",
      difficulty: QUESTION_DIFFICULTY.MEDIUM,
      options: [
        { sortOrder: 1, content: "ভদ্রার্জুন", isCorrect: true },
        { sortOrder: 2, content: "শর্মিষ্ঠা", isCorrect: false },
        { sortOrder: 3, content: "নীলদর্পণ", isCorrect: false },
        { sortOrder: 4, content: "কুলীনকুলসর্বস্ব", isCorrect: false },
      ],
    },
    {
      subjectCode: "BAN-101",
      stem: "কোনটি শুদ্ধ বানান?",
      plainStem: "কোনটি শুদ্ধ বানান?",
      explanation: "মুহূর্মুহু শব্দের সঠিক বানান হলো ম-হ্রস্ব উ, হ-দীর্ঘ উ-রেফ, ম-হ্রস্ব উ, হ-হ্রস্ব উ-বিসর্গ (মুহূর্ত থেকে)।",
      difficulty: QUESTION_DIFFICULTY.HARD,
      options: [
        { sortOrder: 1, content: "মুহুরমুহু", isCorrect: false },
        { sortOrder: 2, content: "মুহূর্মুহু", isCorrect: true },
        { sortOrder: 3, content: "মুহুমুহু", isCorrect: false },
        { sortOrder: 4, content: "মুহূর্মূহু", isCorrect: false },
      ],
    },
    {
      subjectCode: "BAN-101",
      stem: "'সূর্য' শব্দের সমার্থক শব্দ কোনটি?",
      plainStem: "'সূর্য' শব্দের সমার্থক শব্দ কোনটি?",
      explanation: "সূর্য এর সমার্থক শব্দ অর্ক, রবি, ভানু, দিনকর, মার্তণ্ড। শশাঙ্ক মানে চাঁদ।",
      difficulty: QUESTION_DIFFICULTY.EASY,
      options: [
        { sortOrder: 1, content: "শশাঙ্ক", isCorrect: false },
        { sortOrder: 2, content: "মার্তণ্ড", isCorrect: true },
        { sortOrder: 3, content: "অম্বু", isCorrect: false },
        { sortOrder: 4, content: "সুধাংশু", isCorrect: false },
      ],
    },
    {
      subjectCode: "BAN-101",
      stem: "'মনমাঝি' কোন সমাসের উদাহরণ?",
      plainStem: "'মনমাঝি' কোন সমাসের উদাহরণ?",
      explanation: "মন রূপ মাঝি = মনমাঝি, এটি রূপক কর্মধারয় সমাসের দৃষ্টান্ত।",
      difficulty: QUESTION_DIFFICULTY.MEDIUM,
      options: [
        { sortOrder: 1, content: "উপমান কর্মধারয়", isCorrect: false },
        { sortOrder: 2, content: "রূপক কর্মধারয়", isCorrect: true },
        { sortOrder: 3, content: "উপমিত কর্মধারয়", isCorrect: false },
        { sortOrder: 4, content: "মধ্যপদলোপী কর্মধারয়", isCorrect: false },
      ],
    },
    {
      subjectCode: "BAN-101",
      stem: "কাজী নজরুল ইসলামের বিদ্রোহী কবিতাটি কোন কাব্যগ্রন্থের অন্তর্ভুক্ত?",
      plainStem: "কাজী নজরুল ইসলামের বিদ্রোহী কবিতাটি কোন কাব্যগ্রন্থের অন্তর্ভুক্ত?",
      explanation: "১৯২২ সালে প্রকাশিত নজরুলের প্রথম কাব্যগ্রন্থ 'অগ্নিবীণা'-র দ্বিতীয় কবিতা 'বিদ্রোহী'।",
      difficulty: QUESTION_DIFFICULTY.EASY,
      options: [
        { sortOrder: 1, content: "বিষের বাঁশী", isCorrect: false },
        { sortOrder: 2, content: "অগ্নিবীণা", isCorrect: true },
        { sortOrder: 3, content: "সর্বহারা", isCorrect: false },
        { sortOrder: 4, content: "সন্ধ্যা", isCorrect: false },
      ],
    },
    {
      subjectCode: "BAN-101",
      stem: "'সন্ধি' ব্যাকরণের কোন অংশে আলোচিত হয়?",
      plainStem: "'সন্ধি' ব্যাকরণের কোন অংশে আলোচিত হয়?",
      explanation: "সন্ধি ধ্বনির মিলন নির্দেশ করে, তাই এটি ধ্বনিতত্ত্বে (Phonology) আলোচিত হয়।",
      difficulty: QUESTION_DIFFICULTY.EASY,
      options: [
        { sortOrder: 1, content: "রূপতত্ত্বে", isCorrect: false },
        { sortOrder: 2, content: "ধ্বনিতত্ত্বে", isCorrect: true },
        { sortOrder: 3, content: "বাক্যতত্ত্বে", isCorrect: false },
        { sortOrder: 4, content: "অর্থতত্ত্বে", isCorrect: false },
      ],
    },
    {
      subjectCode: "BAN-101",
      stem: "কোনটি মুক্তিযুদ্ধভিত্তিক উপন্যাস?",
      plainStem: "কোনটি মুক্তিযুদ্ধভিত্তিক উপন্যাস?",
      explanation: "শওকত ওসমানের 'জাহান্নাম হইতে বিদায়' এবং আনোয়ার পাশার 'রাইফেল রোটি আওরাত' মুক্তিযুদ্ধভিত্তিক উপন্যাস।",
      difficulty: QUESTION_DIFFICULTY.MEDIUM,
      options: [
        { sortOrder: 1, content: "রাইফেল রোটি আওরাত", isCorrect: true },
        { sortOrder: 2, content: "চোখের বালি", isCorrect: false },
        { sortOrder: 3, content: "তিতাস একটি নদীর নাম", isCorrect: false },
        { sortOrder: 4, content: "পদ্মানদীর মাঝি", isCorrect: false },
      ],
    },
    {
      subjectCode: "BAN-101",
      stem: "'পদ্মগোখরো' গল্পটির রচয়িতা কে?",
      plainStem: "'পদ্মগোখরো' গল্পটির রচয়িতা কে?",
      explanation: "কাজী নজরুল ইসলাম রচিত পদ্মগোখরো একটি বিখ্যাত গল্প।",
      difficulty: QUESTION_DIFFICULTY.HARD,
      options: [
        { sortOrder: 1, content: "শরৎচন্দ্র চট্টোপাধ্যায়", isCorrect: false },
        { sortOrder: 2, content: "কাজী নজরুল ইসলাম", isCorrect: true },
        { sortOrder: 3, content: "মানিক বন্দ্যোপাধ্যায়", isCorrect: false },
        { sortOrder: 4, content: "বিভূতিভূষণ বন্দ্যোপাধ্যায়", isCorrect: false },
      ],
    },
    {
      subjectCode: "BAN-101",
      stem: "'খিড়কি' শব্দের বিপরীতার্থক শব্দ কোনটি?",
      plainStem: "'খিড়কি' শব্দের বিপরীতার্থক শব্দ কোনটি?",
      explanation: "খিড়কি মানে বাড়ির পেছনের ছোট গোপন দরজা, এর বিপরীত সিংহদ্বার (মূল প্রবেশদ্বার)।",
      difficulty: QUESTION_DIFFICULTY.MEDIUM,
      options: [
        { sortOrder: 1, content: "সিংহদ্বার", isCorrect: true },
        { sortOrder: 2, content: "বাতায়ন", isCorrect: false },
        { sortOrder: 3, content: "অলিন্দ", isCorrect: false },
        { sortOrder: 4, content: "তোরণ", isCorrect: false },
      ],
    },

    // --- ENGLISH (11-20) ---
    {
      subjectCode: "ENG-102",
      stem: "Identify the correct passive form: 'Who wrote Hamlet?'",
      plainStem: "Identify the correct passive form: 'Who wrote Hamlet?'",
      explanation: "Interrogative 'Who' becomes 'By whom', followed by auxiliary verb 'was Hamlet written?'.",
      difficulty: QUESTION_DIFFICULTY.EASY,
      options: [
        { sortOrder: 1, content: "By whom Hamlet was written?", isCorrect: false },
        { sortOrder: 2, content: "By whom was Hamlet written?", isCorrect: true },
        { sortOrder: 3, content: "Who was Hamlet written by?", isCorrect: false },
        { sortOrder: 4, content: "Hamlet was written by whom?", isCorrect: false },
      ],
    },
    {
      subjectCode: "ENG-102",
      stem: "The word 'Omniscient' means —",
      plainStem: "The word 'Omniscient' means —",
      explanation: "Omniscient comes from Omni (all) + Scient (knowing), meaning knowing everything.",
      difficulty: QUESTION_DIFFICULTY.EASY,
      options: [
        { sortOrder: 1, content: "All powerful", isCorrect: false },
        { sortOrder: 2, content: "All knowing", isCorrect: true },
        { sortOrder: 3, content: "Present everywhere", isCorrect: false },
        { sortOrder: 4, content: "Immortal", isCorrect: false },
      ],
    },
    {
      subjectCode: "ENG-102",
      stem: "Choose the correct spelling:",
      plainStem: "Choose the correct spelling:",
      explanation: "Surveillance is spelled with double l and eillance.",
      difficulty: QUESTION_DIFFICULTY.HARD,
      options: [
        { sortOrder: 1, content: "Surveilance", isCorrect: false },
        { sortOrder: 2, content: "Surveillance", isCorrect: true },
        { sortOrder: 3, content: "Sureillance", isCorrect: false },
        { sortOrder: 4, content: "Survaliance", isCorrect: false },
      ],
    },
    {
      subjectCode: "ENG-102",
      stem: "Who wrote the famous poem 'The Solitary Reaper'?",
      plainStem: "Who wrote the famous poem 'The Solitary Reaper'?",
      explanation: "William Wordsworth, the prominent romantic poet of nature, composed 'The Solitary Reaper'.",
      difficulty: QUESTION_DIFFICULTY.EASY,
      options: [
        { sortOrder: 1, content: "P.B. Shelley", isCorrect: false },
        { sortOrder: 2, content: "William Wordsworth", isCorrect: true },
        { sortOrder: 3, content: "John Keats", isCorrect: false },
        { sortOrder: 4, content: "Lord Byron", isCorrect: false },
      ],
    },
    {
      subjectCode: "ENG-102",
      stem: "Complete the sentence: 'If he had studied harder, he ___ the exam.'",
      plainStem: "Complete the sentence: 'If he had studied harder, he ___ the exam.'",
      explanation: "Third conditional structure: If + Past Perfect, Subject + would have + Past Participle.",
      difficulty: QUESTION_DIFFICULTY.MEDIUM,
      options: [
        { sortOrder: 1, content: "would pass", isCorrect: false },
        { sortOrder: 2, content: "would have passed", isCorrect: true },
        { sortOrder: 3, content: "passed", isCorrect: false },
        { sortOrder: 4, content: "will have passed", isCorrect: false },
      ],
    },
    {
      subjectCode: "ENG-102",
      stem: "What is the noun form of the adjective 'Brief'?",
      plainStem: "What is the noun form of the adjective 'Brief'?",
      explanation: "The noun form of brief is 'brevity', meaning conciseness.",
      difficulty: QUESTION_DIFFICULTY.MEDIUM,
      options: [
        { sortOrder: 1, content: "Briefness", isCorrect: false },
        { sortOrder: 2, content: "Brevity", isCorrect: true },
        { sortOrder: 3, content: "Briefing", isCorrect: false },
        { sortOrder: 4, content: "Briefly", isCorrect: false },
      ],
    },
    {
      subjectCode: "ENG-102",
      stem: "The idiom 'A bolt from the blue' signifies —",
      plainStem: "The idiom 'A bolt from the blue' signifies —",
      explanation: "A bolt from the blue means an unexpected and sudden shock or disaster.",
      difficulty: QUESTION_DIFFICULTY.EASY,
      options: [
        { sortOrder: 1, content: "A sunny thunderstorm", isCorrect: false },
        { sortOrder: 2, content: "An unexpected event", isCorrect: true },
        { sortOrder: 3, content: "A pleasant surprise", isCorrect: false },
        { sortOrder: 4, content: "A lucky accident", isCorrect: false },
      ],
    },
    {
      subjectCode: "ENG-102",
      stem: "Which literary period does Charles Dickens belong to?",
      plainStem: "Which literary period does Charles Dickens belong to?",
      explanation: "Charles Dickens is one of the most celebrated novelists of the Victorian period (1832-1901).",
      difficulty: QUESTION_DIFFICULTY.MEDIUM,
      options: [
        { sortOrder: 1, content: "Romantic Period", isCorrect: false },
        { sortOrder: 2, content: "Victorian Period", isCorrect: true },
        { sortOrder: 3, content: "Modern Period", isCorrect: false },
        { sortOrder: 4, content: "Renaissance", isCorrect: false },
      ],
    },
    {
      subjectCode: "ENG-102",
      stem: "Neither of the two candidates ___ qualified for the post.",
      plainStem: "Neither of the two candidates ___ qualified for the post.",
      explanation: "'Neither of' takes a singular verb in standard formal grammar ('is' or 'was').",
      difficulty: QUESTION_DIFFICULTY.MEDIUM,
      options: [
        { sortOrder: 1, content: "are", isCorrect: false },
        { sortOrder: 2, content: "is", isCorrect: true },
        { sortOrder: 3, content: "were", isCorrect: false },
        { sortOrder: 4, content: "have been", isCorrect: false },
      ],
    },
    {
      subjectCode: "ENG-102",
      stem: "What is the antonym of 'Ephemeral'?",
      plainStem: "What is the antonym of 'Ephemeral'?",
      explanation: "Ephemeral means short-lived or transitory; its antonym is eternal or permanent.",
      difficulty: QUESTION_DIFFICULTY.HARD,
      options: [
        { sortOrder: 1, content: "Fleeting", isCorrect: false },
        { sortOrder: 2, content: "Eternal", isCorrect: true },
        { sortOrder: 3, content: "Transient", isCorrect: false },
        { sortOrder: 4, content: "Momentary", isCorrect: false },
      ],
    },

    // --- MATHEMATICS (21-30) ---
    {
      subjectCode: "MATH-103",
      stem: "যদি একটি দ্রব্যের ক্রয়মূল্য ৮০০ টাকা হয় এবং ২০% লাভে বিক্রয় করা হয়, তবে বিক্রয়মূল্য কত?",
      plainStem: "যদি একটি দ্রব্যের ক্রয়মূল্য ৮০০ টাকা হয় এবং ২০% লাভে বিক্রয় করা হয়, তবে বিক্রয়মূল্য কত?",
      explanation: "লাভ = ৮০০ এর ২০% = ১৬০ টাকা। বিক্রয়মূল্য = ৮০০ + ১৬০ = ৯৬০ টাকা।",
      difficulty: QUESTION_DIFFICULTY.EASY,
      options: [
        { sortOrder: 1, content: "৯২০ টাকা", isCorrect: false },
        { sortOrder: 2, content: "৯৬০ টাকা", isCorrect: true },
        { sortOrder: 3, content: "৯৮০ টাকা", isCorrect: false },
        { sortOrder: 4, content: "১০০০ টাকা", isCorrect: false },
      ],
    },
    {
      subjectCode: "MATH-103",
      stem: "x + 1/x = 3 হলে, x² + 1/x² এর মান কত?",
      plainStem: "x + 1/x = 3 হলে, x² + 1/x² এর মান কত?",
      explanation: "x² + 1/x² = (x + 1/x)² - 2 = 3² - 2 = 9 - 2 = 7।",
      difficulty: QUESTION_DIFFICULTY.EASY,
      options: [
        { sortOrder: 1, content: "৯", isCorrect: false },
        { sortOrder: 2, content: "৭", isCorrect: true },
        { sortOrder: 3, content: "১১", isCorrect: false },
        { sortOrder: 4, content: "৫", isCorrect: false },
      ],
    },
    {
      subjectCode: "MATH-103",
      stem: "একটি ত্রিভুজের তিন কোণের অনুপাত ২ : ৩ : ৫ হলে, বৃহত্তম কোণটির মান কত ডিগ্রি?",
      plainStem: "একটি ত্রিভুজের তিন কোণের অনুপাত ২ : ৩ : ৫ হলে, বৃহত্তম কোণটির মান কত ডিগ্রি?",
      explanation: "অনুপাতগুলোর যোগফল = ২ + ৩ + ৫ = ১০। বৃহত্তম কোণ = ১৮০° × (৫ / ১০) = ৯০°।",
      difficulty: QUESTION_DIFFICULTY.MEDIUM,
      options: [
        { sortOrder: 1, content: "৭৫°", isCorrect: false },
        { sortOrder: 2, content: "৯০°", isCorrect: true },
        { sortOrder: 3, content: "১০০°", isCorrect: false },
        { sortOrder: 4, content: "১২০°", isCorrect: false },
      ],
    },
    {
      subjectCode: "MATH-103",
      stem: "১ থেকে ১০০ পর্যন্ত সংখ্যার যোগফল কত?",
      plainStem: "১ থেকে ১০০ পর্যন্ত সংখ্যার যোগফল কত?",
      explanation: "n সংখ্যক স্বাভাবিক সংখ্যার যোগফল = n(n+1)/2 = 100 × 101 / 2 = 5050।",
      difficulty: QUESTION_DIFFICULTY.EASY,
      options: [
        { sortOrder: 1, content: "৫০০০", isCorrect: false },
        { sortOrder: 2, content: "৫০৫০", isCorrect: true },
        { sortOrder: 3, content: "৫১০০", isCorrect: false },
        { sortOrder: 4, content: "৫৫০০", isCorrect: false },
      ],
    },
    {
      subjectCode: "MATH-103",
      stem: "log₂ 64 এর মান কত?",
      plainStem: "log₂ 64 এর মান কত?",
      explanation: "64 = 2⁶, সুতরাং log₂ 2⁶ = 6 log₂ 2 = 6 × 1 = 6।",
      difficulty: QUESTION_DIFFICULTY.EASY,
      options: [
        { sortOrder: 1, content: "৪", isCorrect: false },
        { sortOrder: 2, content: "৬", isCorrect: true },
        { sortOrder: 3, content: "৮", isCorrect: false },
        { sortOrder: 4, content: "৩২", isCorrect: false },
      ],
    },
    {
      subjectCode: "MATH-103",
      stem: "একটি বৃত্তের ব্যাসার্ধ দ্বিগুণ করা হলে তার ক্ষেত্রফল কতগুণ বৃদ্ধি পাবে?",
      plainStem: "একটি বৃত্তের ব্যাসার্ধ দ্বিগুণ করা হলে তার ক্ষেত্রফল কতগুণ বৃদ্ধি পাবে?",
      explanation: "ক্ষেত্রফল = πr²। r দ্বিগুণ হলে ক্ষেত্রফল = π(2r)² = 4πr² (৪ গুণ হবে)।",
      difficulty: QUESTION_DIFFICULTY.MEDIUM,
      options: [
        { sortOrder: 1, content: "২ গুণ", isCorrect: false },
        { sortOrder: 2, content: "৪ গুণ", isCorrect: true },
        { sortOrder: 3, content: "৮ গুণ", isCorrect: false },
        { sortOrder: 4, content: "১৬ গুণ", isCorrect: false },
      ],
    },
    {
      subjectCode: "MATH-103",
      stem: "১০ জন লোক একটি কাজ ১৫ দিনে করতে পারে। ওই কাজ ২৫ জন লোক কত দিনে সম্পন্ন করতে পারবে?",
      plainStem: "১০ জন লোক একটি কাজ ১৫ দিনে করতে পারে। ওই কাজ ২৫ জন লোক কত দিনে সম্পন্ন করতে পারবে?",
      explanation: "দিন সংখ্যা = (১০ × ১৫) / ২৫ = ১৫০ / ২৫ = ৬ দিন।",
      difficulty: QUESTION_DIFFICULTY.EASY,
      options: [
        { sortOrder: 1, content: "৫ দিন", isCorrect: false },
        { sortOrder: 2, content: "৬ দিন", isCorrect: true },
        { sortOrder: 3, content: "৮ দিন", isCorrect: false },
        { sortOrder: 4, content: "১০ দিন", isCorrect: false },
      ],
    },
    {
      subjectCode: "MATH-103",
      stem: "ধারাটির পরবর্তী সংখ্যা কত? ৩, ৭, ১৫, ৩১, ৬৩, ___?",
      plainStem: "ধারাটির পরবর্তী সংখ্যা কত? ৩, ৭, ১৫, ৩১, ৬৩, ___?",
      explanation: "প্যাটার্ন: (সংখ্যা × ২) + ১। অতএব, (৬৩ × ২) + ১ = ১২৬ + ১ = ১২৭।",
      difficulty: QUESTION_DIFFICULTY.MEDIUM,
      options: [
        { sortOrder: 1, content: "১২৫", isCorrect: false },
        { sortOrder: 2, content: "১২৭", isCorrect: true },
        { sortOrder: 3, content: "১২৮", isCorrect: false },
        { sortOrder: 4, content: "১৩১", isCorrect: false },
      ],
    },
    {
      subjectCode: "MATH-103",
      stem: "একটি সামান্তরিকের ভূমি ১২ সেমি এবং উচ্চতা ৮ সেমি হলে ক্ষেত্রফল কত?",
      plainStem: "একটি সামান্তরিকের ভূমি ১২ সেমি এবং উচ্চতা ৮ সেমি হলে ক্ষেত্রফল কত?",
      explanation: "সামান্তরিকের ক্ষেত্রফল = ভূমি × উচ্চতা = ১২ × ৮ = ৯৬ বর্গ সেমি।",
      difficulty: QUESTION_DIFFICULTY.EASY,
      options: [
        { sortOrder: 1, content: "৪৮ বর্গ সেমি", isCorrect: false },
        { sortOrder: 2, content: "৯৬ বর্গ সেমি", isCorrect: true },
        { sortOrder: 3, content: "১০৮ বর্গ সেমি", isCorrect: false },
        { sortOrder: 4, content: "১৪৪ বর্গ সেমি", isCorrect: false },
      ],
    },
    {
      subjectCode: "MATH-103",
      stem: "বার্ষিক ১০% মুনাফায় ৫০০০ টাকার ৩ বছরের চক্রবৃদ্ধি মূলধন কত হবে?",
      plainStem: "বার্ষিক ১০% মুনাফায় ৫০০০ টাকার ৩ বছরের চক্রবৃদ্ধি মূলধন কত হবে?",
      explanation: "C = P(1 + r)ⁿ = 5000 × (1 + 0.1)³ = 5000 × 1.331 = 6655 টাকা।",
      difficulty: QUESTION_DIFFICULTY.HARD,
      options: [
        { sortOrder: 1, content: "৬০০০ টাকা", isCorrect: false },
        { sortOrder: 2, content: "৬৬৫৫ টাকা", isCorrect: true },
        { sortOrder: 3, content: "৬৫০০ টাকা", isCorrect: false },
        { sortOrder: 4, content: "৬৭৫০ টাকা", isCorrect: false },
      ],
    },

    // --- GENERAL KNOWLEDGE (31-40) ---
    {
      subjectCode: "GK-104",
      stem: "বাংলাদেশের সংবিধান কবে গণপরিষদে গৃহীত হয়?",
      plainStem: "বাংলাদেশের সংবিধান কবে গণপরিষদে গৃহীত হয়?",
      explanation: "১৯৭২ সালের ৪ নভেম্বর গণপরিষদে বাংলাদেশের সংবিধান গৃহীত হয় এবং ১৬ ডিসেম্বর বলবৎ হয়।",
      difficulty: QUESTION_DIFFICULTY.EASY,
      options: [
        { sortOrder: 1, content: "২৬ মার্চ ১৯৭২", isCorrect: false },
        { sortOrder: 2, content: "৪ নভেম্বর ১৯৭২", isCorrect: true },
        { sortOrder: 3, content: "১৬ ডিসেম্বর ১৯৭২", isCorrect: false },
        { sortOrder: 4, content: "১০ জানুয়ারি ১৯৭২", isCorrect: false },
      ],
    },
    {
      subjectCode: "GK-104",
      stem: "মুজিবনগর সরকার কোন তারিখে শপথ গ্রহণ করেছিল?",
      plainStem: "মুজিবনগর সরকার কোন তারিখে শপথ গ্রহণ করেছিল?",
      explanation: "মুজিবনগর সরকার গঠিত হয় ১০ এপ্রিল ১৯৭১ এবং শপথ গ্রহণ করে ১৭ এপ্রিল ১৯৭১।",
      difficulty: QUESTION_DIFFICULTY.EASY,
      options: [
        { sortOrder: 1, content: "১০ এপ্রিল ১৯৭১", isCorrect: false },
        { sortOrder: 2, content: "১৭ এপ্রিল ১৯৭১", isCorrect: true },
        { sortOrder: 3, content: "২৫ মার্চ ১৯৭১", isCorrect: false },
        { sortOrder: 4, content: "১ মে ১৯৭১", isCorrect: false },
      ],
    },
    {
      subjectCode: "GK-104",
      stem: "পদ্মা সেতুর মোট দৈর্ঘ্য কত কিলোমিটার?",
      plainStem: "পদ্মা সেতুর মোট দৈর্ঘ্য কত কিলোমিটার?",
      explanation: "পদ্মা বহুমুখী মূল সেতুর দৈর্ঘ্য ৬.১৫ কিলোমিটার এবং প্রস্থ ১৮.১৮ মিটার।",
      difficulty: QUESTION_DIFFICULTY.EASY,
      options: [
        { sortOrder: 1, content: "৫.৮০ কিমি", isCorrect: false },
        { sortOrder: 2, content: "৬.১৫ কিমি", isCorrect: true },
        { sortOrder: 3, content: "৬.২৫ কিমি", isCorrect: false },
        { sortOrder: 4, content: "৭.০০ কিমি", isCorrect: false },
      ],
    },
    {
      subjectCode: "GK-104",
      stem: "জাতিসংঘের বর্তমান মহাসচিব আন্তোনিও গুতেরেস কোন দেশের নাগরিক?",
      plainStem: "জাতিসংঘের বর্তমান মহাসচিব আন্তোনিও গুতেরেস কোন দেশের নাগরিক?",
      explanation: "আন্তোনিও গুতেরেস পর্তুগালের সাবেক প্রধানমন্ত্রী এবং বর্তমান জাতিসংঘ মহাসচিব।",
      difficulty: QUESTION_DIFFICULTY.EASY,
      options: [
        { sortOrder: 1, content: "স্পেন", isCorrect: false },
        { sortOrder: 2, content: "পর্তুগাল", isCorrect: true },
        { sortOrder: 3, content: "ব্রাজিল", isCorrect: false },
        { sortOrder: 4, content: "ইতালি", isCorrect: false },
      ],
    },
    {
      subjectCode: "GK-104",
      stem: "আন্তর্জাতিক আদালত (ICJ) এর সদর দপ্তর কোথায় অবস্থিত?",
      plainStem: "আন্তর্জাতিক আদালত (ICJ) এর সদর দপ্তর কোথায় অবস্থিত?",
      explanation: "আন্তর্জাতিক ন্যায়বিচার আদালত নেদারল্যান্ডসের দ্য হেগ (The Hague) শহরে অবস্থিত।",
      difficulty: QUESTION_DIFFICULTY.MEDIUM,
      options: [
        { sortOrder: 1, content: "জেনেভা", isCorrect: false },
        { sortOrder: 2, content: "দ্য হেগ", isCorrect: true },
        { sortOrder: 3, content: "নিউইয়র্ক", isCorrect: false },
        { sortOrder: 4, content: "ভিয়েনা", isCorrect: false },
      ],
    },
    {
      subjectCode: "GK-104",
      stem: "বঙ্গবন্ধু স্যাটেলাইট-১ কোন দেশ থেকে উৎক্ষেপণ করা হয়েছিল?",
      plainStem: "বঙ্গবন্ধু স্যাটেলাইট-১ কোন দেশ থেকে উৎক্ষেপণ করা হয়েছিল?",
      explanation: "২০১৮ সালের ১২ মে যুক্তরাষ্ট্রের ফ্লোরিডার কেনেডি স্পেস সেন্টার থেকে ফ্যালকন-৯ রকেটের মাধ্যমে উৎক্ষেপণ করা হয়।",
      difficulty: QUESTION_DIFFICULTY.MEDIUM,
      options: [
        { sortOrder: 1, content: "রাশিয়া", isCorrect: false },
        { sortOrder: 2, content: "যুক্তরাষ্ট্র", isCorrect: true },
        { sortOrder: 3, content: "ফ্রান্স", isCorrect: false },
        { sortOrder: 4, content: "চীন", isCorrect: false },
      ],
    },
    {
      subjectCode: "GK-104",
      stem: "গ্রিনউইচ মান সময় (GMT) অপেক্ষা বাংলাদেশ সময় কত ঘণ্টা এগিয়ে?",
      plainStem: "গ্রিনউইচ মান সময় (GMT) অপেক্ষা বাংলাদেশ সময় কত ঘণ্টা এগিয়ে?",
      explanation: "বাংলাদেশ ৯০ ডিগ্রি পূর্ব দ্রাঘিমাংশে অবস্থিত হওয়ায় জিএমটি থেকে ৬ ঘণ্টা এগিয়ে (GMT+6)।",
      difficulty: QUESTION_DIFFICULTY.EASY,
      options: [
        { sortOrder: 1, content: "৫ ঘণ্টা", isCorrect: false },
        { sortOrder: 2, content: "৬ ঘণ্টা", isCorrect: true },
        { sortOrder: 3, content: "৫.৩০ ঘণ্টা", isCorrect: false },
        { sortOrder: 4, content: "৭ ঘণ্টা", isCorrect: false },
      ],
    },
    {
      subjectCode: "GK-104",
      stem: "জলবায়ু বিষয়ক বিশ্ব শীর্ষ সম্মেলন COP28 কোথায় অনুষ্ঠিত হয়?",
      plainStem: "জলবায়ু বিষয়ক বিশ্ব শীর্ষ সম্মেলন COP28 কোথায় অনুষ্ঠিত হয়?",
      explanation: "COP28 সম্মেলন ২০২৩ সালের ডিসেম্বর মাসে সংযুক্ত আরব আমিরাতের দুবাইয়ে অনুষ্ঠিত হয়েছিল।",
      difficulty: QUESTION_DIFFICULTY.MEDIUM,
      options: [
        { sortOrder: 1, content: "প্যারিস", isCorrect: false },
        { sortOrder: 2, content: "দুবাই", isCorrect: true },
        { sortOrder: 3, content: "গ্লাসগো", isCorrect: false },
        { sortOrder: 4, content: "মিশর", isCorrect: false },
      ],
    },
    {
      subjectCode: "GK-104",
      stem: "বাংলাদেশের সংবিধানে নাগরিকদের মৌলিক অধিকার কয়টি অনুচ্ছেদে নিশ্চিত করা হয়েছে?",
      plainStem: "বাংলাদেশের সংবিধানে নাগরিকদের মৌলিক অধিকার কয়টি অনুচ্ছেদে নিশ্চিত করা হয়েছে?",
      explanation: "সংবিধানের তৃতীয় ভাগে ২৭ থেকে ৪৪ নম্বর অনুচ্ছেদ পর্যন্ত ১৮টি মৌলিক অধিকার লিপিবদ্ধ রয়েছে।",
      difficulty: QUESTION_DIFFICULTY.HARD,
      options: [
        { sortOrder: 1, content: "১২টি", isCorrect: false },
        { sortOrder: 2, content: "১৮টি", isCorrect: true },
        { sortOrder: 3, content: "১৫টি", isCorrect: false },
        { sortOrder: 4, content: "২১টি", isCorrect: false },
      ],
    },
    {
      subjectCode: "GK-104",
      stem: "বিশ্বব্যাংকের বর্তমান প্রেসিডেন্টের নাম কি?",
      plainStem: "বিশ্বব্যাংকের বর্তমান প্রেসিডেন্টের নাম কি?",
      explanation: "অজয় বঙ্গ (Ajay Banga) ২০২৩ সালে বিশ্বব্যাংকের ১৪তম প্রেসিডেন্ট হিসেবে দায়িত্ব গ্রহণ করেন।",
      difficulty: QUESTION_DIFFICULTY.MEDIUM,
      options: [
        { sortOrder: 1, content: "ডেভিড মালপাস", isCorrect: false },
        { sortOrder: 2, content: "অজয় বঙ্গ", isCorrect: true },
        { sortOrder: 3, content: "জিম ইয়ং কিম", isCorrect: false },
        { sortOrder: 4, content: "ক্রিস্টালিনা জর্জিয়েভা", isCorrect: false },
      ],
    },

    // --- SCIENCE & ICT (41-50) ---
    {
      subjectCode: "SCI-105",
      stem: "রক্তে হিমোগ্লোবিনের প্রধান কাজ কি?",
      plainStem: "রক্তে হিমোগ্লোবিনের প্রধান কাজ কি?",
      explanation: "লোহিত রক্তকণিকার হিমোগ্লোবিন ফুসফুস থেকে দেহের প্রতিটি কোষে অক্সিজেন পরিবহন করে।",
      difficulty: QUESTION_DIFFICULTY.EASY,
      options: [
        { sortOrder: 1, content: "জীবাণু ধ্বংস করা", isCorrect: false },
        { sortOrder: 2, content: "অক্সিজেন পরিবহন করা", isCorrect: true },
        { sortOrder: 3, content: "রক্ত জমাট বাঁধতে সাহায্য করা", isCorrect: false },
        { sortOrder: 4, content: "হরমোন তৈরি করা", isCorrect: false },
      ],
    },
    {
      subjectCode: "SCI-105",
      stem: "সূর্যের আলো থেকে সরাসরি কোন ভিটামিন পাওয়া যায়?",
      plainStem: "সূর্যের আলো থেকে সরাসরি কোন ভিটামিন পাওয়া যায়?",
      explanation: "সূর্যরশ্মির আল্ট্রাভায়োলেট-বি মানবদেহের ত্বকে ভিটামিন ডি সংশ্লেষণ করে।",
      difficulty: QUESTION_DIFFICULTY.EASY,
      options: [
        { sortOrder: 1, content: "ভিটামিন এ", isCorrect: false },
        { sortOrder: 2, content: "ভিটামিন ডি", isCorrect: true },
        { sortOrder: 3, content: "ভিটামিন সি", isCorrect: false },
        { sortOrder: 4, content: "ভিটামিন ই", isCorrect: false },
      ],
    },
    {
      subjectCode: "SCI-105",
      stem: "বায়ুমণ্ডলে কোন গ্যাসের পরিমাণ সবচেয়ে বেশি?",
      plainStem: "বায়ুমণ্ডলে কোন গ্যাসের পরিমাণ সবচেয়ে বেশি?",
      explanation: "বায়ুমণ্ডলে নাইট্রোজেন গ্যাসের পরিমাণ সর্বাধিক (প্রায় ৭৮.০৯%)।",
      difficulty: QUESTION_DIFFICULTY.EASY,
      options: [
        { sortOrder: 1, content: "অক্সিজেন", isCorrect: false },
        { sortOrder: 2, content: "নাইট্রোজেন", isCorrect: true },
        { sortOrder: 3, content: "কার্বন ডাই অক্সাইড", isCorrect: false },
        { sortOrder: 4, content: "আর্গন", isCorrect: false },
      ],
    },
    {
      subjectCode: "SCI-105",
      stem: "কম্পিউটারের ব্রেইন বা মস্তিষ্ক কাকে বলা হয়?",
      plainStem: "কম্পিউটারের ব্রেইন বা মস্তিষ্ক কাকে বলা হয়?",
      explanation: "CPU (Central Processing Unit) কম্পিউটারের সকল নির্দেশ ও গাণিতিক কাজ পরিচালনা করে।",
      difficulty: QUESTION_DIFFICULTY.EASY,
      options: [
        { sortOrder: 1, content: "RAM", isCorrect: false },
        { sortOrder: 2, content: "CPU", isCorrect: true },
        { sortOrder: 3, content: "Motherboard", isCorrect: false },
        { sortOrder: 4, content: "Hard Disk", isCorrect: false },
      ],
    },
    {
      subjectCode: "SCI-105",
      stem: "IPv4 অ্যাড্রেস কত বিটের হয়ে থাকে?",
      plainStem: "IPv4 অ্যাড্রেস কত বিটের হয়ে থাকে?",
      explanation: "IPv4 অ্যাড্রেস ৩২ বিটের (৪ বাইট) এবং IPv6 অ্যাড্রেস ১২৮ বিটের হয়।",
      difficulty: QUESTION_DIFFICULTY.MEDIUM,
      options: [
        { sortOrder: 1, content: "১৬ বিট", isCorrect: false },
        { sortOrder: 2, content: "৩২ বিট", isCorrect: true },
        { sortOrder: 3, content: "৬৪ বিট", isCorrect: false },
        { sortOrder: 4, content: "১২৮ বিট", isCorrect: false },
      ],
    },
    {
      subjectCode: "SCI-105",
      stem: "কোনটি উদ্বায়ী মেমোরি (Volatile Memory)?",
      plainStem: "কোনটি উদ্বায়ী মেমোরি (Volatile Memory)?",
      explanation: "RAM একটি ভোলাটাইল বা অস্থায়ী মেমোরি, বিদ্যুৎ চলে গেলে এর সব ডেটা মুছে যায়।",
      difficulty: QUESTION_DIFFICULTY.EASY,
      options: [
        { sortOrder: 1, content: "ROM", isCorrect: false },
        { sortOrder: 2, content: "RAM", isCorrect: true },
        { sortOrder: 3, content: "SSD", isCorrect: false },
        { sortOrder: 4, content: "Flash Drive", isCorrect: false },
      ],
    },
    {
      subjectCode: "SCI-105",
      stem: "পেনিসিলিন আবিষ্কার করেন কে?",
      plainStem: "পেনিসিলিন আবিষ্কার করেন কে?",
      explanation: "১৯২৮ সালে স্কটিশ বিজ্ঞানী স্যার আলেকজান্ডার ফ্লেমিং প্রথম অ্যান্টিবায়োটিক পেনিসিলিন আবিষ্কার করেন।",
      difficulty: QUESTION_DIFFICULTY.EASY,
      options: [
        { sortOrder: 1, content: "এডওয়ার্ড জেনার", isCorrect: false },
        { sortOrder: 2, content: "আলেকজান্ডার ফ্লেমিং", isCorrect: true },
        { sortOrder: 3, content: "লুই পাস্তুর", isCorrect: false },
        { sortOrder: 4, content: "রবার্ট হুক", isCorrect: false },
      ],
    },
    {
      subjectCode: "SCI-105",
      stem: "HTTP এর পূর্ণরূপ কি?",
      plainStem: "HTTP এর পূর্ণরূপ কি?",
      explanation: "HTTP = HyperText Transfer Protocol, যা ওয়েবে ডেটা আদান-প্রদানে ব্যবহৃত হয়।",
      difficulty: QUESTION_DIFFICULTY.EASY,
      options: [
        { sortOrder: 1, content: "HyperText Terminal Protocol", isCorrect: false },
        { sortOrder: 2, content: "HyperText Transfer Protocol", isCorrect: true },
        { sortOrder: 3, content: "High Transfer Text Protocol", isCorrect: false },
        { sortOrder: 4, content: "Hyper Transfer Test Program", isCorrect: false },
      ],
    },
    {
      subjectCode: "SCI-105",
      stem: "শব্দের গতিবেগ কোন মাধ্যমে সবচেয়ে বেশি?",
      plainStem: "শব্দের গতিবেগ কোন মাধ্যমে সবচেয়ে বেশি?",
      explanation: "কঠিন মাধ্যমে কণাগুলো অত্যন্ত কাছাকাছি থাকায় কঠিন মাধ্যমে শব্দের বেগ সবচেয়ে বেশি।",
      difficulty: QUESTION_DIFFICULTY.MEDIUM,
      options: [
        { sortOrder: 1, content: "বায়বীয় মাধ্যমে", isCorrect: false },
        { sortOrder: 2, content: "কঠিন মাধ্যমে", isCorrect: true },
        { sortOrder: 3, content: "তরল মাধ্যমে", isCorrect: false },
        { sortOrder: 4, content: "শূন্য মাধ্যমে", isCorrect: false },
      ],
    },
    {
      subjectCode: "SCI-105",
      stem: "ChatGPT তৈরিকারী প্রতিষ্ঠানের নাম কি?",
      plainStem: "ChatGPT তৈরিকারী প্রতিষ্ঠানের নাম কি?",
      explanation: "ChatGPT কৃত্রিম বুদ্ধিমত্তা চ্যাটবটটি OpenAI কোম্পানি কর্তৃক উদ্ভাবিত হয়েছে।",
      difficulty: QUESTION_DIFFICULTY.EASY,
      options: [
        { sortOrder: 1, content: "Google DeepMind", isCorrect: false },
        { sortOrder: 2, content: "OpenAI", isCorrect: true },
        { sortOrder: 3, content: "Microsoft", isCorrect: false },
        { sortOrder: 4, content: "Meta AI", isCorrect: false },
      ],
    },
  ];

  const createdQuestions: any[] = [];

  for (let idx = 0; idx < questionBlueprints.length; idx++) {
    const qb = questionBlueprints[idx]!;
    const qNumber = idx + 1;
    const code = `Q-${String(qNumber).padStart(4, "0")}`;
    const slug = createSlug(`q-${qNumber}-${qb.plainStem.slice(0, 30)}`);

    // Assign some questions to passages
    let assignedPassageId = null;
    if (idx === 7 || idx === 8) assignedPassageId = createdPassages[0]?._id; // Bangla Liberation War
    if (idx === 49) assignedPassageId = createdPassages[1]?._id; // AI

    // 1. Create Question
    const questionDoc = await Question.create({
      code,
      slug,
      type: QUESTION_TYPE.SINGLE_MCQ,
      difficulty: qb.difficulty,
      status: QUESTION_STATUS.PUBLISHED,
      passageId: assignedPassageId,
      isFlagged: false,
      author: authorId,
      publishedAt: new Date(),
    });

    // 2. Create SingleMcqVersion
    await SingleMcqVersion.create({
      question: questionDoc._id,
      versionNumber: 1,
      isCurrent: true,
      stem: `<p>${qb.stem}</p>`,
      plainStem: qb.plainStem,
      explanation: `<p>${qb.explanation}</p>`,
      language: "bn",
      options: qb.options,
      author: authorId,
    });

    createdQuestions.push(questionDoc);
  }

  logger.info(`✅ Created ${createdQuestions.length} Questions with current active versions.`);
  logger.info("ℹ️ Question Mappings were NOT created (ready for your manual/API testing).");

  logger.info("🎉 Database Seeding Completed Successfully!");
  return {
    collectionsCount: createdCollections.length,
    categoriesCount: createdCategories.length,
    tracksCount: createdTracks.length,
    subjectsCount: createdSubjects.length,
    topicsCount: createdTopics.length,
    passagesCount: createdPassages.length,
    pastExamsCount: createdPastExams.length,
    questionsCount: createdQuestions.length,
    mappingsCount: 0,
  };
};

// Allow direct execution via CLI: `bun run ./src/app/seeds/seed-sample-data.ts`
if (import.meta.main) {
  (async () => {
    try {
      await connectDB(configs.databaseUrl);
      const summary = await seedSampleData();
      console.table(summary);
      await mongoose.disconnect();
      process.exit(0);
    } catch (error) {
      logger.error("❌ Seeding failed:", error);
      console.error(error);
      await mongoose.disconnect();
      process.exit(1);
    }
  })();
}
