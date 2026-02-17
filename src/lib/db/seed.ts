import { db } from './index';
import { boards, levelConfigs } from './schema';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

async function seed() {
  console.log('🌱 Seeding database...');

  try {
    // Seed boards
    console.log('📋 Seeding boards...');
    await db.insert(boards).values([
      {
        slug: 'free',
        nameKo: '자유게시판',
        nameEn: 'Free Board',
        description: '자유롭게 이야기를 나누는 공간입니다',
        type: 'general',
        sortOrder: 1,
        minLevelToPost: 1,
        isActive: true,
      },
      {
        slug: 'strategy',
        nameKo: '전략게시판',
        nameEn: 'Strategy Board',
        description: '포커 전략을 공유하고 토론하는 공간입니다',
        type: 'strategy',
        sortOrder: 2,
        minLevelToPost: 3,
        isActive: true,
      },
      {
        slug: 'hands',
        nameKo: '핸드게시판',
        nameEn: 'Hand Review Board',
        description: '핸드 히스토리를 공유하고 분석하는 공간입니다',
        type: 'hand',
        sortOrder: 3,
        minLevelToPost: 1,
        isActive: true,
      },
      {
        slug: 'tournament',
        nameKo: '토너먼트',
        nameEn: 'Tournament',
        description: '토너먼트 정보와 후기를 공유하는 공간입니다',
        type: 'tournament',
        sortOrder: 4,
        minLevelToPost: 5,
        isActive: true,
      },
      {
        slug: 'beginner',
        nameKo: '초보자게시판',
        nameEn: 'Beginner Board',
        description: '초보자를 위한 질문과 답변 공간입니다',
        type: 'beginner',
        sortOrder: 5,
        minLevelToPost: 1,
        isActive: true,
      },
      {
        slug: 'notice',
        nameKo: '공지사항',
        nameEn: 'Notice',
        description: '사이트 공지사항',
        type: 'notice',
        sortOrder: 0,
        minLevelToPost: 50,
        isActive: true,
      },
    ]);
    console.log('✅ Boards seeded');

    // Seed level configs (50 levels with exponential XP curve)
    console.log('📊 Seeding level configs...');
    const levelData = [];

    for (let level = 1; level <= 50; level++) {
      // Exponential XP curve: base XP * (1.15 ^ level)
      const baseXp = 100;
      const minXp = level === 1 ? 0 : Math.floor(baseXp * Math.pow(1.15, level - 1));

      // Color scheme based on level ranges
      let color = '#94a3b8'; // Slate (default)
      if (level >= 40) color = '#c084fc'; // Purple (legendary)
      else if (level >= 30) color = '#fbbf24'; // Gold (master)
      else if (level >= 20) color = '#60a5fa'; // Blue (expert)
      else if (level >= 10) color = '#34d399'; // Green (intermediate)

      // Level names
      const levelNames = [
        'Beginner', 'Learner', 'Player', 'Enthusiast', 'Regular',
        'Skilled', 'Advanced', 'Experienced', 'Proficient', 'Expert',
        'Master', 'Pro', 'Champion', 'Elite', 'Legendary',
        'Mythic', 'Divine', 'Immortal', 'Celestial', 'Supreme',
      ];

      const nameIndex = Math.floor((level - 1) / 2.5);
      const name = levelNames[Math.min(nameIndex, levelNames.length - 1)] || `Level ${level}`;

      levelData.push({
        level,
        name: `${name} ${level}`,
        minXp,
        color,
        badgeUrl: `/badges/level-${level}.png`,
      });
    }

    await db.insert(levelConfigs).values(levelData);
    console.log('✅ Level configs seeded (50 levels)');

    console.log('🎉 Seeding completed successfully!');
  } catch (error) {
    console.error('❌ Error seeding database:', error);
    throw error;
  }
}

seed()
  .catch((error) => {
    console.error('Seed failed:', error);
    process.exit(1);
  })
  .finally(() => {
    process.exit(0);
  });
