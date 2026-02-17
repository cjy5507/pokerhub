import postgres from 'postgres';

const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://postgres:postgres@127.0.0.1:54322/postgres';
const sql = postgres(DATABASE_URL);

async function seed() {
  console.log('🌱 Seeding database...\n');

  // 1. Create boards
  console.log('📋 Creating boards...');
  await sql`
    INSERT INTO boards (slug, name_ko, name_en, description, type, sort_order, is_active)
    VALUES
      ('free', '자유게시판', 'Free Board', '자유롭게 이야기하는 공간입니다', 'general', 1, true),
      ('strategy', '전략게시판', 'Strategy Board', '포커 전략과 팁을 공유하세요', 'strategy', 2, true),
      ('hands', '핸드분석', 'Hand Analysis', '핸드 히스토리를 분석하고 토론하세요', 'hand', 3, true),
      ('tournament', '토너먼트', 'Tournament', '토너먼트 정보와 후기를 공유하세요', 'tournament', 4, true),
      ('beginner', '초보자게시판', 'Beginner Board', '포커 입문자를 위한 공간입니다', 'beginner', 5, true),
      ('notice', '공지사항', 'Notice', '공지사항 게시판', 'notice', 0, true)
    ON CONFLICT (slug) DO NOTHING
  `;
  console.log('  ✅ 6 boards created\n');

  // 2. Create test user (password: test1234)
  console.log('👤 Creating test user...');
  // bcrypt hash of "test1234"
  const passwordHash = '$2b$10$sENCA.WCYv7EsaZYQt0TiuXZshcMu4kpaw7xsPmcHAlHRu9GFsaXC';

  const [testUser] = await sql`
    INSERT INTO users (email, nickname, password_hash, level, xp, points, role, bio)
    VALUES ('test@pokerhub.kr', '포커마스터', ${passwordHash}, 5, 1500, 5000, 'user', '포커를 사랑하는 테스트 유저입니다.')
    ON CONFLICT (email) DO UPDATE SET nickname = EXCLUDED.nickname
    RETURNING id
  `;
  console.log(`  ✅ Test user created (id: ${testUser.id})\n`);

  // 3. Create second test user
  console.log('👤 Creating second test user...');
  const [testUser2] = await sql`
    INSERT INTO users (email, nickname, password_hash, level, xp, points, role, bio)
    VALUES ('test2@pokerhub.kr', '초보포커러', ${passwordHash}, 2, 300, 2000, 'user', '포커 배우는 중입니다!')
    ON CONFLICT (email) DO UPDATE SET nickname = EXCLUDED.nickname
    RETURNING id
  `;
  console.log(`  ✅ Second test user created (id: ${testUser2.id})\n`);

  // 4. Create sample posts
  console.log('📝 Creating sample posts...');
  const boards = await sql`SELECT id, slug FROM boards`;
  const boardMap = new Map(boards.map((b: any) => [b.slug, b.id]));

  const samplePosts = [
    { board: 'free', title: '안녕하세요! 포커허브에 첫 글을 올립니다', content: '포커허브에 가입했습니다. 앞으로 많은 이야기 나눠요! 포커를 좋아하는 분들과 소통하고 싶습니다.' },
    { board: 'free', title: '오늘 홈게임 후기', content: '친구들과 홈게임을 했는데 올인 3번이나 성공했네요. 오늘은 운이 좋았습니다. 다음에도 이런 결과가 나오면 좋겠어요.' },
    { board: 'strategy', title: 'NL50 레이트 포지션 오픈레인지 분석', content: '레이트 포지션에서의 오픈레인지를 분석해봤습니다. BTN에서는 약 40-50%의 핸드를 오픈할 수 있습니다. CO에서는 약 25-30% 정도가 적합합니다.' },
    { board: 'strategy', title: '3-bet 팟에서의 cbet 전략', content: '3-bet 팟에서 IP와 OOP에 따른 c-bet 사이징과 빈도에 대해 분석했습니다. IP에서는 33% cbet이 효율적이고, OOP에서는 체크가 더 좋은 경우가 많습니다.' },
    { board: 'hands', title: 'AA vs KK 올인 상황 분석', content: 'UTG에서 3bb 레이즈, BTN에서 12bb 3-bet, UTG 올인, BTN 콜. 플롭: K♠ 7♦ 2♣. 결과는... 뒤집어졌습니다.' },
    { board: 'tournament', title: '주말 토너먼트 참가 후기', content: '이번 주말 로컬 토너먼트에 참가했습니다. 128명 참가, 최종 15등으로 마무리했네요. 아쉽지만 좋은 경험이었습니다.' },
    { board: 'beginner', title: '포지션의 중요성 - 초보자 가이드', content: '포커에서 가장 중요한 개념 중 하나가 포지션입니다. 늦게 행동할수록 유리한 이유를 설명합니다. 상대방의 행동을 보고 결정할 수 있기 때문이죠.' },
    { board: 'beginner', title: '팟 오즈 계산하는 방법', content: '팟 오즈는 콜할 금액 대비 팟의 비율입니다. 예를 들어 팟이 100이고 콜이 20이면 팟 오즈는 5:1입니다. 이를 확률로 변환하면 약 17%입니다.' },
    { board: 'notice', title: '[공지] 포커허브 오픈 안내', content: '포커허브가 오픈되었습니다! 포커를 사랑하는 모든 분들을 환영합니다. 게시판 이용 규칙을 숙지해주세요.' },
  ];

  for (const post of samplePosts) {
    const authorId = Math.random() > 0.5 ? testUser.id : testUser2.id;
    await sql`
      INSERT INTO posts (board_id, author_id, title, content, content_html, status, view_count, like_count, comment_count)
      VALUES (${boardMap.get(post.board)}, ${authorId}, ${post.title}, ${post.content}, ${`<p>${post.content}</p>`}, 'published', ${Math.floor(Math.random() * 100)}, ${Math.floor(Math.random() * 20)}, ${Math.floor(Math.random() * 10)})
    `;
  }
  console.log(`  ✅ ${samplePosts.length} sample posts created\n`);

  // 5. Update board post counts
  console.log('📊 Updating board post counts...');
  await sql`
    UPDATE boards SET post_count = (
      SELECT COUNT(*) FROM posts WHERE posts.board_id = boards.id AND posts.status = 'published'
    )
  `;
  console.log('  ✅ Post counts updated\n');

  // 6. Create badges
  console.log('🏆 Creating badges...');
  await sql`
    INSERT INTO badges (slug, name_ko, name_en, description_ko, description_en, icon_url, category, rarity, sort_order, is_active)
    VALUES
      ('first_post', '첫 글 작성', 'First Post', '첫 번째 게시글을 작성했습니다', 'Published your first post', '/icons/badges/first-post.svg', 'achievement', 'common', 1, true),
      ('commenter_10', '활발한 댓글러', 'Active Commenter', '댓글 10개를 달성했습니다', 'Reached 10 comments', '/icons/badges/commenter-10.svg', 'participation', 'common', 2, true),
      ('popular_writer', '인기 작가', 'Popular Writer', '좋아요 50개를 받은 글이 있습니다', 'Post received 50 likes', '/icons/badges/popular-writer.svg', 'skill', 'rare', 3, true),
      ('streak_master', '출석왕', 'Streak Master', '7일 연속 출석을 달성했습니다', 'Achieved 7-day attendance streak', '/icons/badges/streak-master.svg', 'participation', 'rare', 4, true),
      ('veteran', '베테랑', 'Veteran', '레벨 20을 달성했습니다', 'Reached level 20', '/icons/badges/veteran.svg', 'achievement', 'epic', 5, true),
      ('social_butterfly', '소셜 나비', 'Social Butterfly', '팔로워 10명을 달성했습니다', 'Reached 10 followers', '/icons/badges/social-butterfly.svg', 'social', 'rare', 6, true)
    ON CONFLICT (slug) DO NOTHING
  `;
  console.log('  ✅ 6 badges created\n');

  // 7. Create chat rooms
  console.log('💬 Creating chat rooms...');
  await sql`
    INSERT INTO chat_rooms (slug, name_ko, name_en, type, is_active)
    VALUES
      ('general', '일반 채팅', 'General Chat', 'general', true),
      ('strategy', '전략 토론', 'Strategy Discussion', 'game', true),
      ('tournament', '토너먼트 정보', 'Tournament Info', 'tournament', true)
    ON CONFLICT (slug) DO NOTHING
  `;
  console.log('  ✅ 3 chat rooms created\n');

  // 8. Create missions
  console.log('🎯 Creating missions...');
  await sql`
    INSERT INTO missions (name_ko, name_en, description_ko, type, condition_type, condition_target, point_reward, xp_reward, is_active)
    VALUES
      ('오늘의 첫 글', 'Daily Post', '오늘 게시글 1개 작성하기', 'daily', 'post_count', 1, 50, 20, true),
      ('댓글 달인', 'Comment Master', '오늘 댓글 3개 달기', 'daily', 'comment_count', 3, 30, 15, true),
      ('출석 체크', 'Daily Attendance', '오늘 출석하기', 'daily', 'attendance', 1, 20, 10, true),
      ('주간 활동왕', 'Weekly Active', '이번 주 게시글 5개 작성하기', 'weekly', 'post_count', 5, 200, 100, true),
      ('핸드 공유', 'Share Hand', '핸드 히스토리 공유하기', 'one_time', 'hand_share', 1, 100, 50, true)
    ON CONFLICT DO NOTHING
  `;
  console.log('  ✅ 5 missions created\n');

  console.log('🎉 Seeding complete!\n');
  console.log('📌 Test accounts:');
  console.log('   Email: test@pokerhub.kr / Password: test1234');
  console.log('   Email: test2@pokerhub.kr / Password: test1234');

  await sql.end();
  process.exit(0);
}

seed().catch((err) => {
  console.error('❌ Seed error:', err);
  process.exit(1);
});
