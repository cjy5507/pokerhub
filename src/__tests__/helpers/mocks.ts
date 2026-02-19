import { vi } from 'vitest';

// ==================== Session Mock ====================

export type MockSession = {
  userId: string;
  email: string;
  nickname: string;
  role: string;
};

export const mockAdminSession: MockSession = {
  userId: 'admin-user-id',
  email: 'admin@openpoker.kr',
  nickname: '관리자',
  role: 'admin',
};

export const mockUserSession: MockSession = {
  userId: 'test-user-id',
  email: 'test@openpoker.kr',
  nickname: '테스트유저',
  role: 'user',
};

export const mockUser2Session: MockSession = {
  userId: 'test-user-2-id',
  email: 'test2@openpoker.kr',
  nickname: '테스트유저2',
  role: 'user',
};

// ==================== Mock DB Query Builder ====================

/**
 * Creates a chainable mock that supports drizzle's fluent API pattern:
 * db.select().from().where().orderBy().limit().offset()
 * db.insert().values().returning().onConflictDoUpdate()
 * db.update().set().where().returning()
 * db.delete().where()
 */
export function createChainableMock(resolveValue: any = []) {
  const chain: any = {};
  const methods = [
    'select', 'from', 'where', 'orderBy', 'limit', 'offset', 'for',
    'insert', 'values', 'returning', 'onConflictDoNothing', 'onConflictDoUpdate',
    'update', 'set', 'delete',
    'innerJoin', 'leftJoin', 'rightJoin',
    'groupBy', 'having',
  ];

  for (const method of methods) {
    chain[method] = vi.fn().mockReturnValue(chain);
  }

  // Terminal operations resolve to the value
  chain.then = (resolve: any) => resolve(resolveValue);
  // Make it thenable (for await)
  chain[Symbol.for('nodejs.util.inspect.custom')] = () => resolveValue;

  // Override to make it work as a promise
  const proxy = new Proxy(chain, {
    get(target, prop) {
      if (prop === 'then') {
        return (resolve: any, reject: any) => {
          try {
            resolve(resolveValue);
          } catch (e) {
            reject?.(e);
          }
        };
      }
      return target[prop];
    },
  });

  return proxy;
}

/**
 * Creates a mock Drizzle db instance with configurable query results.
 */
export function createMockDb() {
  const mockDb: any = {
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    execute: vi.fn(),
    transaction: vi.fn(),
    query: {},
  };

  return mockDb;
}

/**
 * Setup a mock db.select() chain that resolves to the given result.
 */
export function mockSelectChain(mockDb: any, result: any[]) {
  const chain = createChainableMock(result);
  mockDb.select.mockReturnValue(chain);
  return chain;
}

/**
 * Setup a mock db.insert() chain that resolves to the given result.
 */
export function mockInsertChain(mockDb: any, result: any[] = []) {
  const chain = createChainableMock(result);
  mockDb.insert.mockReturnValue(chain);
  return chain;
}

/**
 * Setup a mock db.update() chain that resolves to the given result.
 */
export function mockUpdateChain(mockDb: any, result: any[] = []) {
  const chain = createChainableMock(result);
  mockDb.update.mockReturnValue(chain);
  return chain;
}

/**
 * Setup a mock db.delete() chain that resolves to the given result.
 */
export function mockDeleteChain(mockDb: any, result: any[] = []) {
  const chain = createChainableMock(result);
  mockDb.delete.mockReturnValue(chain);
  return chain;
}

// ==================== Common Mock Modules ====================

/**
 * Standard mock setup for Next.js modules used by server actions.
 * Call this in your vi.mock() setup.
 */
export const nextCacheMock = {
  revalidatePath: vi.fn(),
  revalidateTag: vi.fn(),
};

export const nextNavigationMock = {
  redirect: vi.fn(),
  notFound: vi.fn(),
};

// ==================== Test Data Factories ====================

let idCounter = 0;

export function createTestId(prefix = 'test'): string {
  idCounter++;
  return `${prefix}-${idCounter}-${Date.now()}`;
}

export function createTestUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export function createTestPost(overrides: Record<string, any> = {}) {
  return {
    id: createTestUUID(),
    boardId: createTestUUID(),
    authorId: 'test-user-id',
    title: '테스트 게시글',
    content: '테스트 내용입니다.',
    contentHtml: '<p>테스트 내용입니다.</p>',
    status: 'published' as const,
    viewCount: 0,
    likeCount: 0,
    commentCount: 0,
    bookmarkCount: 0,
    isPinned: false,
    isFeatured: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

export function createTestBoard(overrides: Record<string, any> = {}) {
  return {
    id: createTestUUID(),
    slug: 'free',
    nameKo: '자유게시판',
    nameEn: 'Free Board',
    description: '자유롭게 글을 작성하세요',
    isActive: true,
    minLevelToPost: 0,
    minLevelToComment: 0,
    postCount: 0,
    ...overrides,
  };
}

export function createTestUser(overrides: Record<string, any> = {}) {
  return {
    id: 'test-user-id',
    email: 'test@openpoker.kr',
    nickname: '테스트유저',
    passwordHash: '$2a$10$abcdefghijklmnopqrstuuWQiJhN5Y7BjS',
    role: 'user',
    status: 'active',
    level: 1,
    xp: 0,
    points: 1000,
    bio: null,
    avatarUrl: null,
    bannerUrl: null,
    customTitle: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

export function createTestComment(overrides: Record<string, any> = {}) {
  return {
    id: createTestUUID(),
    postId: createTestUUID(),
    authorId: 'test-user-id',
    content: '테스트 댓글입니다.',
    parentId: null,
    status: 'published' as const,
    likeCount: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

export function createTestThread(overrides: Record<string, any> = {}) {
  return {
    id: createTestUUID(),
    authorId: 'test-user-id',
    content: '테스트 쓰레드입니다.',
    contentHtml: '<p>테스트 쓰레드입니다.</p>',
    imageUrl: null,
    likesCount: 0,
    repliesCount: 0,
    createdAt: new Date(),
    ...overrides,
  };
}

export function resetMocks() {
  vi.resetAllMocks();
  idCounter = 0;
}
