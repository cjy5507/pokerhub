import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  createChainableMock,
  mockInsertChain,
  mockUpdateChain,
  mockDeleteChain,
  createTestUser,
  mockUserSession,
  resetMocks,
} from '../helpers/mocks';

// ==================== Module Mocks ====================
// vi.mock factories are hoisted to the top of the file by Vitest, so any
// variables they reference must also be hoisted via vi.hoisted().

const { mockDb } = vi.hoisted(() => {
  const db: any = {
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    execute: vi.fn(),
    transaction: vi.fn(),
    query: {},
  };
  return { mockDb: db };
});

vi.mock('@/lib/db', () => ({ db: mockDb }));

const { getSession } = vi.hoisted(() => ({ getSession: vi.fn() }));
vi.mock('@/lib/auth/session', () => ({ getSession }));

vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));

const { hashPassword, verifyPassword } = vi.hoisted(() => ({
  hashPassword: vi.fn().mockResolvedValue('new-hashed-password'),
  verifyPassword: vi.fn(),
}));
vi.mock('@/lib/auth/password', () => ({ hashPassword, verifyPassword }));

// Import after mocks are set up
import {
  toggleFollow,
  toggleBlock,
  updateProfile,
  updateUserSettings,
  getUserSettings,
  getFollowers,
  getFollowing,
  changePassword,
} from '@/app/(user)/actions';

// ==================== Helpers ====================

/**
 * Wire mockDb.select to return different values on successive calls.
 * Each element in `results` corresponds to one db.select()...await call.
 */
function mockSelectSequence(results: any[][]) {
  let callIndex = 0;
  mockDb.select.mockImplementation(() => {
    const result = results[callIndex] ?? [];
    callIndex++;
    return createChainableMock(result);
  });
}

// ==================== toggleFollow ====================

describe('toggleFollow', () => {
  beforeEach(() => {
    resetMocks();
    vi.clearAllMocks();
  });

  it('returns error when not authenticated', async () => {
    getSession.mockResolvedValue(null);

    const result = await toggleFollow('other-user-id');

    expect(result).toEqual({
      success: false,
      isFollowing: false,
      error: '로그인이 필요합니다',
    });
  });

  it('returns error when trying to follow self', async () => {
    getSession.mockResolvedValue(mockUserSession);

    const result = await toggleFollow(mockUserSession.userId);

    expect(result).toEqual({
      success: false,
      isFollowing: false,
      error: '자기 자신을 팔로우할 수 없습니다',
    });
  });

  it('successfully follows a user when no existing follow record', async () => {
    getSession.mockResolvedValue(mockUserSession);
    // select returns empty (not yet following)
    mockSelectSequence([[]]);
    mockInsertChain(mockDb, []);

    const result = await toggleFollow('target-user-id');

    expect(result).toEqual({ success: true, isFollowing: true });
    expect(mockDb.insert).toHaveBeenCalledOnce();
  });

  it('successfully unfollows a user when existing follow record found', async () => {
    getSession.mockResolvedValue(mockUserSession);
    // select returns an existing follow row
    mockSelectSequence([[{ followerId: mockUserSession.userId, followingId: 'target-user-id' }]]);
    mockDeleteChain(mockDb, []);

    const result = await toggleFollow('target-user-id');

    expect(result).toEqual({ success: true, isFollowing: false });
    expect(mockDb.delete).toHaveBeenCalledOnce();
  });
});

// ==================== toggleBlock ====================

describe('toggleBlock', () => {
  beforeEach(() => {
    resetMocks();
    vi.clearAllMocks();
  });

  it('returns error when not authenticated', async () => {
    getSession.mockResolvedValue(null);

    const result = await toggleBlock('other-user-id');

    expect(result).toEqual({
      success: false,
      isBlocked: false,
      error: '로그인이 필요합니다',
    });
  });

  it('returns error when trying to block self', async () => {
    getSession.mockResolvedValue(mockUserSession);

    const result = await toggleBlock(mockUserSession.userId);

    expect(result).toEqual({
      success: false,
      isBlocked: false,
      error: '자기 자신을 차단할 수 없습니다',
    });
  });

  it('successfully blocks a user when not already blocked', async () => {
    getSession.mockResolvedValue(mockUserSession);
    // First select: check existing block -> empty (not blocked)
    mockSelectSequence([[]]);
    mockInsertChain(mockDb, []);
    // delete is called twice: once for userBlocks insert then userFollows delete
    // Actually block path: insert userBlocks, then delete userFollows
    mockDeleteChain(mockDb, []);

    const result = await toggleBlock('target-user-id');

    expect(result).toEqual({ success: true, isBlocked: true });
    expect(mockDb.insert).toHaveBeenCalledOnce();
    // delete called for the unfollow step
    expect(mockDb.delete).toHaveBeenCalledOnce();
  });

  it('successfully unblocks a user when already blocked', async () => {
    getSession.mockResolvedValue(mockUserSession);
    // select returns existing block
    mockSelectSequence([[{ blockerId: mockUserSession.userId, blockedId: 'target-user-id' }]]);
    mockDeleteChain(mockDb, []);

    const result = await toggleBlock('target-user-id');

    expect(result).toEqual({ success: true, isBlocked: false });
    expect(mockDb.delete).toHaveBeenCalledOnce();
    // insert should NOT be called on unblock
    expect(mockDb.insert).not.toHaveBeenCalled();
  });

  it('blocking a user also removes existing follow relationship', async () => {
    getSession.mockResolvedValue(mockUserSession);
    // select returns empty (not yet blocked)
    mockSelectSequence([[]]);
    mockInsertChain(mockDb, []);
    mockDeleteChain(mockDb, []);

    await toggleBlock('target-user-id');

    // insert for userBlocks, delete for userFollows cleanup
    expect(mockDb.insert).toHaveBeenCalledOnce();
    expect(mockDb.delete).toHaveBeenCalledOnce();
  });
});

// ==================== updateProfile ====================

describe('updateProfile', () => {
  beforeEach(() => {
    resetMocks();
    vi.clearAllMocks();
  });

  it('returns error when not authenticated', async () => {
    getSession.mockResolvedValue(null);

    const result = await updateProfile({ bio: 'Hello' });

    expect(result).toEqual({
      success: false,
      error: '로그인이 필요합니다',
    });
  });

  it('returns error when bio exceeds 500 characters', async () => {
    getSession.mockResolvedValue(mockUserSession);

    const result = await updateProfile({ bio: 'a'.repeat(501) });

    expect(result.success).toBe(false);
    expect(result.error).toBe('자기소개는 500자 이하여야 합니다');
  });

  it('returns error when avatarUrl is not a valid URL', async () => {
    getSession.mockResolvedValue(mockUserSession);

    const result = await updateProfile({ avatarUrl: 'not-a-valid-url' });

    expect(result.success).toBe(false);
    expect(result.error).toBe('유효한 URL을 입력해주세요');
  });

  it('successfully updates profile with valid data', async () => {
    getSession.mockResolvedValue(mockUserSession);
    mockUpdateChain(mockDb, []);

    const result = await updateProfile({
      bio: '안녕하세요, 저는 포커를 좋아합니다.',
      avatarUrl: 'https://example.com/avatar.png',
    });

    expect(result).toEqual({ success: true });
    expect(mockDb.update).toHaveBeenCalledOnce();
  });

  it('allows empty string for avatarUrl to clear the avatar', async () => {
    getSession.mockResolvedValue(mockUserSession);
    mockUpdateChain(mockDb, []);

    const result = await updateProfile({ avatarUrl: '' });

    expect(result).toEqual({ success: true });
    expect(mockDb.update).toHaveBeenCalledOnce();
  });

  it('allows empty string for bannerUrl to clear the banner', async () => {
    getSession.mockResolvedValue(mockUserSession);
    mockUpdateChain(mockDb, []);

    const result = await updateProfile({ bannerUrl: '' });

    expect(result).toEqual({ success: true });
    expect(mockDb.update).toHaveBeenCalledOnce();
  });
});

// ==================== updateUserSettings ====================

describe('updateUserSettings', () => {
  beforeEach(() => {
    resetMocks();
    vi.clearAllMocks();
  });

  it('returns error when not authenticated', async () => {
    getSession.mockResolvedValue(null);

    const result = await updateUserSettings({ notifyComments: true });

    expect(result).toEqual({
      success: false,
      error: '로그인이 필요합니다',
    });
  });

  it('successfully upserts settings using onConflictDoUpdate', async () => {
    getSession.mockResolvedValue(mockUserSession);
    // insert chain needs to support .onConflictDoUpdate()
    mockInsertChain(mockDb, []);

    const result = await updateUserSettings({
      notifyComments: false,
      notifyLikes: true,
      notifyFollows: true,
      notifyMentions: false,
      emailNotifications: true,
      showOnlineStatus: false,
    });

    expect(result).toEqual({ success: true });
    expect(mockDb.insert).toHaveBeenCalledOnce();
  });

  it('successfully upserts partial settings', async () => {
    getSession.mockResolvedValue(mockUserSession);
    mockInsertChain(mockDb, []);

    const result = await updateUserSettings({ notifyLikes: false });

    expect(result).toEqual({ success: true });
    expect(mockDb.insert).toHaveBeenCalledOnce();
  });
});

// ==================== getUserSettings ====================

describe('getUserSettings', () => {
  const defaultSettingsRow = {
    notifyComments: true,
    notifyLikes: true,
    notifyFollows: true,
    notifyMentions: true,
    emailNotifications: false,
    showOnlineStatus: true,
  };

  beforeEach(() => {
    resetMocks();
    vi.clearAllMocks();
  });

  it('returns error when not authenticated', async () => {
    getSession.mockResolvedValue(null);

    const result = await getUserSettings();

    expect(result).toEqual({
      success: false,
      error: '로그인이 필요합니다',
    });
  });

  it('returns existing settings when found', async () => {
    getSession.mockResolvedValue(mockUserSession);
    mockSelectSequence([[defaultSettingsRow]]);

    const result = await getUserSettings();

    expect(result.success).toBe(true);
    expect(result.settings).toEqual(defaultSettingsRow);
    // insert should NOT be called since settings already exist
    expect(mockDb.insert).not.toHaveBeenCalled();
  });

  it('creates and returns default settings when none exist', async () => {
    getSession.mockResolvedValue(mockUserSession);
    // select returns empty (no existing settings)
    mockSelectSequence([[]]);
    // insert returns the newly created row
    mockInsertChain(mockDb, [defaultSettingsRow]);

    const result = await getUserSettings();

    expect(result.success).toBe(true);
    expect(result.settings).toEqual(defaultSettingsRow);
    expect(mockDb.insert).toHaveBeenCalledOnce();
  });
});

// ==================== getFollowers ====================

describe('getFollowers', () => {
  const followerRow = {
    id: 'follower-user-id',
    nickname: '팔로워유저',
    level: 3,
    avatarUrl: null,
  };

  beforeEach(() => {
    resetMocks();
    vi.clearAllMocks();
  });

  it('returns paginated followers list', async () => {
    getSession.mockResolvedValue(null);

    // Call sequence:
    // 1. count query -> [{ value: 1 }]
    // 2. followers data query -> [followerRow]
    // 3. isFollowingBack check per follower -> [] (not following back)
    mockSelectSequence([
      [{ value: 1 }],
      [followerRow],
      [],
    ]);

    const result = await getFollowers('target-user-id', 1);

    expect(result.success).toBe(true);
    expect(result.totalCount).toBe(1);
    expect(result.followers).toHaveLength(1);
    expect(result.followers![0]).toEqual({
      ...followerRow,
      isFollowingBack: false,
    });
  });

  it('includes isFollowingBack: true when the logged-in user follows a follower back', async () => {
    getSession.mockResolvedValue(mockUserSession);

    // Call sequence:
    // 1. count query -> [{ value: 1 }]
    // 2. followers data query -> [followerRow]
    // 3. isFollowingBack check -> non-empty (session user follows this follower)
    mockSelectSequence([
      [{ value: 1 }],
      [followerRow],
      [{ followerId: mockUserSession.userId, followingId: followerRow.id }],
    ]);

    const result = await getFollowers('target-user-id', 1);

    expect(result.success).toBe(true);
    expect(result.followers![0].isFollowingBack).toBe(true);
  });

  it('returns empty followers list when user has no followers', async () => {
    getSession.mockResolvedValue(null);

    mockSelectSequence([
      [{ value: 0 }],
      [],
    ]);

    const result = await getFollowers('target-user-id', 1);

    expect(result.success).toBe(true);
    expect(result.totalCount).toBe(0);
    expect(result.followers).toEqual([]);
  });

  it('sets isFollowingBack to false when not logged in', async () => {
    getSession.mockResolvedValue(null);

    mockSelectSequence([
      [{ value: 1 }],
      [followerRow],
      // No third call since session is null — isFollowingBack check is skipped
    ]);

    const result = await getFollowers('target-user-id', 1);

    expect(result.success).toBe(true);
    expect(result.followers![0].isFollowingBack).toBe(false);
  });
});

// ==================== getFollowing ====================

describe('getFollowing', () => {
  const followingRow = {
    id: 'following-user-id',
    nickname: '팔로잉유저',
    level: 5,
    avatarUrl: 'https://example.com/avatar.png',
  };

  beforeEach(() => {
    resetMocks();
    vi.clearAllMocks();
  });

  it('returns paginated following list', async () => {
    mockSelectSequence([
      [{ value: 1 }],
      [followingRow],
    ]);

    const result = await getFollowing('test-user-id', 1);

    expect(result.success).toBe(true);
    expect(result.totalCount).toBe(1);
    expect(result.following).toHaveLength(1);
    expect(result.following![0]).toEqual(followingRow);
  });

  it('returns empty following list when user follows nobody', async () => {
    mockSelectSequence([
      [{ value: 0 }],
      [],
    ]);

    const result = await getFollowing('test-user-id', 1);

    expect(result.success).toBe(true);
    expect(result.totalCount).toBe(0);
    expect(result.following).toEqual([]);
  });

  it('does not require authentication', async () => {
    // getFollowing has no getSession call — should work without session
    mockSelectSequence([
      [{ value: 0 }],
      [],
    ]);

    const result = await getFollowing('any-user-id');

    expect(result.success).toBe(true);
  });
});

// ==================== changePassword ====================

describe('changePassword', () => {
  const testUser = createTestUser({
    id: mockUserSession.userId,
    passwordHash: 'existing-hash',
  });

  beforeEach(() => {
    resetMocks();
    vi.clearAllMocks();
    hashPassword.mockResolvedValue('new-hashed-password');
  });

  it('returns error when not authenticated', async () => {
    getSession.mockResolvedValue(null);

    const result = await changePassword('old-pass', 'new-pass');

    expect(result).toEqual({
      success: false,
      error: '로그인이 필요합니다',
    });
  });

  it('returns error when current password equals new password', async () => {
    getSession.mockResolvedValue(mockUserSession);

    const result = await changePassword('same-password', 'same-password');

    expect(result).toEqual({
      success: false,
      error: '새 비밀번호는 현재 비밀번호와 달라야 합니다',
    });
    // Should not query DB at all
    expect(mockDb.select).not.toHaveBeenCalled();
  });

  it('returns error when user is not found in the database', async () => {
    getSession.mockResolvedValue(mockUserSession);
    // select returns empty (user not found)
    mockSelectSequence([[]]);

    const result = await changePassword('old-pass', 'new-pass');

    expect(result).toEqual({
      success: false,
      error: '사용자를 찾을 수 없습니다',
    });
    expect(verifyPassword).not.toHaveBeenCalled();
  });

  it('returns error when current password is incorrect', async () => {
    getSession.mockResolvedValue(mockUserSession);
    mockSelectSequence([[testUser]]);
    verifyPassword.mockResolvedValue(false);

    const result = await changePassword('wrong-password', 'new-pass');

    expect(result).toEqual({
      success: false,
      error: '현재 비밀번호가 올바르지 않습니다',
    });
    expect(mockDb.update).not.toHaveBeenCalled();
  });

  it('successfully changes password when current password is correct', async () => {
    getSession.mockResolvedValue(mockUserSession);
    mockSelectSequence([[testUser]]);
    verifyPassword.mockResolvedValue(true);
    mockUpdateChain(mockDb, []);

    const result = await changePassword('correct-password', 'new-pass');

    expect(result).toEqual({ success: true });
    expect(verifyPassword).toHaveBeenCalledWith('correct-password', testUser.passwordHash);
    expect(hashPassword).toHaveBeenCalledWith('new-pass');
    expect(mockDb.update).toHaveBeenCalledOnce();
  });
});
