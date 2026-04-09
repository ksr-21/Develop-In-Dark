/* global require, __dirname, process */
/**
 * Firebase Setup Script
 * 
 * This script creates 100 users (roll numbers 201-300) in Firebase Auth
 * and initializes the Firestore database structure.
 * 
 * PREREQUISITES:
 * 1. Install Firebase Admin SDK: npm install firebase-admin
 * 2. Download your Firebase service account key from:
 *    Firebase Console → Project Settings → Service Accounts → Generate New Private Key
 * 3. Save it as 'serviceAccountKey.json' in this directory
 * 
 * USAGE:
 * node scripts/setup-firebase.js
 */

const admin = require('firebase-admin');
const crypto = require('crypto');

// Initialize Firebase Admin
const serviceAccount = require('../serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const auth = admin.auth();
const db = admin.firestore();

// Generate a unique password for each roll number
function generatePassword(rollNumber) {
  // Creates a deterministic but hard-to-guess password
  // Format: DID + roll + random-looking chars
  const hash = crypto
    .createHash('sha256')
    .update(`develop-in-dark-${rollNumber}-secret-salt-2026`)
    .digest('hex')
    .substring(0, 8);
  return `DiD${rollNumber}@${hash}`;
}

async function createUsers() {
  console.log('🚀 Starting user creation...\n');

  const passwords = [];

  for (let roll = 201; roll <= 300; roll++) {
    const email = `${roll}@contest.com`;
    const password = generatePassword(roll);

    try {
      // Check if user already exists
      try {
        await auth.getUserByEmail(email);
        console.log(`⚠️  User ${roll} already exists, skipping...`);
        passwords.push({ rollNumber: roll, email, password });
        continue;
      } catch {
        // User doesn't exist, create it
      }

      await auth.createUser({
        email,
        password,
        displayName: `Participant ${roll}`,
      });

      console.log(`✅ Created user: ${roll} (${email})`);
      passwords.push({ rollNumber: roll, email, password });
    } catch (error) {
      console.error(`❌ Failed to create user ${roll}:`, error.message);
    }
  }

  // Create admin user
  const adminEmail = 'admin@contest.com';
  const adminPassword = 'AdminDiD@2026!Secure';
  try {
    try {
      await auth.getUserByEmail(adminEmail);
      console.log('⚠️  Admin user already exists');
    } catch {
      await auth.createUser({
        email: adminEmail,
        password: adminPassword,
        displayName: 'Admin',
      });
      console.log('✅ Created admin user');
    }

    const adminRecord = await auth.getUserByEmail(adminEmail);

    // Create admin document in Firestore
    await db.collection('users').doc('admin').set({
      role: 'admin',
      email: adminEmail,
      authEmail: adminEmail,
      uid: adminRecord.uid,
      rollNumber: 'admin',
      name: 'Administrator',
      nameSet: true,
      profileComplete: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('❌ Failed to create admin:', error.message);
  }

  return passwords;
}

async function initializeFirestore() {
  console.log('\n📦 Initializing Firestore collections...\n');

  // Admin Controls
  await db.collection('adminControls').doc('main').set({
    currentRound: 1,
    round1Active: false,
    round2Active: false,
    round3Active: false,
    round1ImageUrl: '',
    round2Duration: 2,
    round2TaskCount: 8,
    round3Duration: 25,
    round3QuestionCount: 21,
    createdAt: new Date().toISOString(),
  });
  console.log('✅ Admin controls initialized');

  // Sample Round 2 Tasks (admin can edit later)
  const sampleTasks = [
    { title: 'Email Writing', description: 'Write a prompt to generate a formal email requesting leave for 2 days.' },
    { title: 'Creative Writing', description: 'Create a prompt to write a short inspirational story in 50 words.' },
    { title: 'Business Idea', description: 'Write a prompt to suggest a unique startup idea for college students with low investment.' },
    { title: 'Summarization', description: 'Create a prompt to summarize any paragraph into 3 bullet points.' },
    { title: 'Interview Prep', description: 'Write a prompt to generate 3 basic interview questions on programming with answers.' },
    { title: 'Daily Life Planning', description: 'Create a prompt to make a simple and productive daily schedule for a student.' },
    { title: 'Comparison Task', description: 'Write a prompt to explain the difference between Machine Learning and Artificial Intelligence in simple points.' },
    { title: 'Instruction-Based Task', description: 'Create a prompt to generate step-by-step instructions to create a PowerPoint presentation on any topic.' },
  ];

  for (let i = 0; i < sampleTasks.length; i++) {
    await db.collection('round2Tasks').doc(`task${i + 1}`).set({
      ...sampleTasks[i],
      task: sampleTasks[i].description,
      order: i + 1,
      createdAt: new Date().toISOString(),
    });
  }
  console.log('✅ Sample Round 2 tasks created (8 tasks)');

  // Sample Quiz Questions
  const sampleQuiz = [
    {
      question: 'What does AI stand for?',
      options: ['Automated Intelligence', 'Artificial Intelligence', 'Advanced Internet', 'Automatic Interface'],
      correctAnswer: 'B',
    },
    {
      question: 'Which company developed ChatGPT?',
      options: ['Google', 'Microsoft', 'OpenAI', 'Meta'],
      correctAnswer: 'C',
    },
    {
      question: 'What is a prompt in AI?',
      options: ['Output', 'Instruction given to AI', 'Error message', 'Code only'],
      correctAnswer: 'B',
    },
    {
      question: 'Which of the following is an AI tool?',
      options: ['MS Word', 'ChatGPT', 'Calculator', 'Notepad'],
      correctAnswer: 'B',
    },
    {
      question: 'What does GPT stand for?',
      options: ['General Processing Tool', 'Generative Pre-trained Transformer', 'Global Programming Tech', 'Graphic Processing Type'],
      correctAnswer: 'B',
    },
    {
      question: 'AI mainly works on:',
      options: ['Water', 'Data', 'Air', 'Hardware only'],
      correctAnswer: 'B',
    },
    {
      question: 'Which field uses AI the most?',
      options: ['Healthcare', 'Education', 'Entertainment', 'All of the above'],
      correctAnswer: 'D',
    },
    {
      question: 'A good prompt should be:',
      options: ['Vague', 'Clear', 'Confusing', 'Long only'],
      correctAnswer: 'B',
    },
    {
      question: 'What improves AI output?',
      options: ['Clear instructions', 'Random words', 'No input', 'Shortcuts'],
      correctAnswer: 'A',
    },
    {
      question: 'What is the best way to get accurate results?',
      options: ['Give detailed prompt', 'Give no prompt', 'Use emojis only', 'Ask unrelated questions'],
      correctAnswer: 'A',
    },
    {
      question: 'Prompt engineering is:',
      options: ['Building hardware', 'Writing better prompts', 'Coding only', 'Designing chips'],
      correctAnswer: 'B',
    },
    {
      question: 'Which is an example of a good prompt?',
      options: ['Tell something', 'Explain AI in 5 lines with examples', 'Write anything', 'Do it'],
      correctAnswer: 'B',
    },
    {
      question: 'Adding constraints (like word limit) helps in:',
      options: ['Confusing AI', 'Improving output', 'Slowing AI', 'Stopping AI'],
      correctAnswer: 'B',
    },
    {
      question: 'AI cannot:',
      options: ['Learn patterns', 'Think like humans fully', 'Generate text', 'Answer questions'],
      correctAnswer: 'B',
    },
    {
      question: 'Who is known as the father of computers?',
      options: ['Alan Turing', 'Charles Babbage', 'Bill Gates', 'Elon Musk'],
      correctAnswer: 'B',
    },
    {
      question: 'What is the full form of CPU?',
      options: ['Central Process Unit', 'Central Processing Unit', 'Computer Personal Unit', 'Control Processing Unit'],
      correctAnswer: 'B',
    },
    {
      question: 'Which language is mainly used for AI?',
      options: ['HTML', 'Python', 'CSS', 'C'],
      correctAnswer: 'B',
    },
    {
      question: 'What is the brain of the computer?',
      options: ['RAM', 'CPU', 'Hard Disk', 'Monitor'],
      correctAnswer: 'B',
    },
    {
      question: 'Which of these is an input device?',
      options: ['Monitor', 'Printer', 'Keyboard', 'Speaker'],
      correctAnswer: 'C',
    },
    {
      question: 'What does URL stand for?',
      options: ['Uniform Resource Locator', 'Universal Resource Link', 'Unique Reference Link', 'Uniform Reference Locator'],
      correctAnswer: 'A',
    },
    {
      question: 'Which of the following is NOT a programming language?',
      options: ['Python', 'Java', 'HTML', 'Windows'],
      correctAnswer: 'D',
    },
  ];

  for (let i = 0; i < sampleQuiz.length; i++) {
    await db.collection('quizQuestions').doc(`q${i + 1}`).set({
      ...sampleQuiz[i],
      order: i + 1,
      createdAt: new Date().toISOString(),
    });
  }
  console.log('✅ Sample quiz questions created (21 questions)');
}

async function main() {
  console.log('='.repeat(60));
  console.log('  DEVELOP IN DARK - Firebase Setup Script');
  console.log('='.repeat(60));

  const passwords = await createUsers();
  await initializeFirestore();

  // Save passwords to a file
  console.log('\n📄 Saving credentials...\n');

  const csvContent = 'Roll Number,Email,Password\n' +
    passwords.map(p => `${p.rollNumber},${p.email},${p.password}`).join('\n') +
    `\n\nAdmin,admin@contest.com,AdminDiD@2026!Secure`;

  require('fs').writeFileSync(
    require('path').join(__dirname, 'credentials.csv'),
    csvContent
  );

  console.log('✅ Credentials saved to scripts/credentials.csv');
  console.log('\n⚠️  IMPORTANT: Keep credentials.csv secure and do NOT commit to git!\n');
  console.log('='.repeat(60));
  console.log('  Setup Complete! 🎉');
  console.log('='.repeat(60));

  process.exit(0);
}

main().catch(console.error);
