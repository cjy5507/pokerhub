'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Save, Loader2, ShoppingBag, Award, Type } from 'lucide-react';
import { getUserSettings, updateUserSettings, updateProfile, changePassword, deleteAccount } from '../actions';
import { getBadgeShop, purchaseBadge, purchaseCustomTitle } from './actions';
import type { BadgeShopItem } from './actions';

type Tab = 'profile' | 'notifications' | 'account' | 'shop';

const RARITY_COLORS: Record<string, string> = {
  common: 'border-gray-500 text-gray-400',
  rare: 'border-blue-500 text-blue-400',
  epic: 'border-purple-500 text-purple-400',
  legendary: 'border-yellow-500 text-yellow-400',
};

const RARITY_LABELS: Record<string, string> = {
  common: '일반',
  rare: '레어',
  epic: '에픽',
  legendary: '전설',
};

const CATEGORY_LABELS: Record<string, string> = {
  achievement: '업적',
  participation: '참여',
  skill: '실력',
  social: '소셜',
  special: '특별',
};

export default function SettingsClient() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<Tab>('profile');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Profile state
  const [bio, setBio] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [bannerUrl, setBannerUrl] = useState('');

  // Notification state
  const [notifyComments, setNotifyComments] = useState(true);
  const [notifyLikes, setNotifyLikes] = useState(true);
  const [notifyFollows, setNotifyFollows] = useState(true);
  const [notifyMentions, setNotifyMentions] = useState(true);
  const [showOnlineStatus, setShowOnlineStatus] = useState(true);

  // Account state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [deletePassword, setDeletePassword] = useState('');

  // Shop state
  const [shopBadges, setShopBadges] = useState<BadgeShopItem[]>([]);
  const [shopPoints, setShopPoints] = useState(0);
  const [shopLoading, setShopLoading] = useState(false);
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [customTitle, setCustomTitle] = useState('');
  const [currentTitle, setCurrentTitle] = useState<string | null>(null);

  const loadSettings = useCallback(async () => {
    const result = await getUserSettings();
    if (result.success && result.settings) {
      setNotifyComments(result.settings.notifyComments);
      setNotifyLikes(result.settings.notifyLikes);
      setNotifyFollows(result.settings.notifyFollows);
      setNotifyMentions(result.settings.notifyMentions);
      setShowOnlineStatus(result.settings.showOnlineStatus);
    }
  }, []);

  const loadShop = useCallback(async () => {
    setShopLoading(true);
    const result = await getBadgeShop();
    if (result.success && result.badges) {
      setShopBadges(result.badges);
      setShopPoints(result.points ?? 0);
      setCurrentTitle(result.customTitle ?? null);
    }
    setShopLoading(false);
  }, []);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  useEffect(() => {
    if (activeTab === 'shop') {
      loadShop();
    }
  }, [activeTab, loadShop]);

  async function handleProfileSave() {
    setLoading(true);
    setMessage(null);

    const result = await updateProfile({
      bio: bio.trim() || undefined,
      avatarUrl: avatarUrl.trim() || undefined,
      bannerUrl: bannerUrl.trim() || undefined,
    });

    setLoading(false);

    if (result.success) {
      setMessage({ type: 'success', text: '프로필이 업데이트되었습니다' });
    } else {
      setMessage({ type: 'error', text: result.error || '오류가 발생했습니다' });
    }
  }

  async function handleNotificationsSave() {
    setLoading(true);
    setMessage(null);

    const result = await updateUserSettings({
      notifyComments,
      notifyLikes,
      notifyFollows,
      notifyMentions,
      showOnlineStatus,
    });

    setLoading(false);

    if (result.success) {
      setMessage({ type: 'success', text: '알림 설정이 저장되었습니다' });
    } else {
      setMessage({ type: 'error', text: result.error || '오류가 발생했습니다' });
    }
  }

  async function handlePasswordChange() {
    if (newPassword !== confirmPassword) {
      setMessage({ type: 'error', text: '새 비밀번호가 일치하지 않습니다' });
      return;
    }

    if (newPassword.length < 8) {
      setMessage({ type: 'error', text: '비밀번호는 8자 이상이어야 합니다' });
      return;
    }

    setLoading(true);
    setMessage(null);

    const result = await changePassword(currentPassword, newPassword);

    setLoading(false);

    if (result.success) {
      setMessage({ type: 'success', text: '비밀번호가 변경되었습니다' });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } else {
      setMessage({ type: 'error', text: result.error || '오류가 발생했습니다' });
    }
  }

  async function handleBadgePurchase(badgeId: string) {
    setLoading(true);
    setMessage(null);

    const result = await purchaseBadge(badgeId);

    setLoading(false);

    if (result.success) {
      setMessage({ type: 'success', text: '뱃지를 구매했습니다!' });
      await loadShop();
    } else {
      setMessage({ type: 'error', text: result.error || '구매에 실패했습니다' });
    }
  }

  async function handleTitlePurchase() {
    const trimmed = customTitle.trim();
    if (trimmed.length < 2 || trimmed.length > 20) {
      setMessage({ type: 'error', text: '타이틀은 2~20자여야 합니다' });
      return;
    }

    setLoading(true);
    setMessage(null);

    const result = await purchaseCustomTitle(trimmed);

    setLoading(false);

    if (result.success) {
      setMessage({ type: 'success', text: '커스텀 타이틀이 변경되었습니다!' });
      setCurrentTitle(trimmed);
      setCustomTitle('');
      await loadShop();
    } else {
      setMessage({ type: 'error', text: result.error || '변경에 실패했습니다' });
    }
  }

  const filteredBadges = activeCategory === 'all'
    ? shopBadges
    : shopBadges.filter((b) => b.category === activeCategory);

  const categories = ['all', 'achievement', 'participation', 'skill', 'social', 'special'];

  const tabs = [
    { id: 'profile' as const, label: '프로필' },
    { id: 'notifications' as const, label: '알림' },
    { id: 'shop' as const, label: '상점' },
    { id: 'account' as const, label: '계정' },
  ];

  return (
    <div className="min-h-screen bg-op-bg text-op-text pb-20 lg:pb-0">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <h1 className="text-2xl sm:text-3xl font-bold mb-6">설정</h1>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 border-b border-op-border overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2.5 sm:px-6 sm:py-3 font-medium transition-colors whitespace-nowrap ${
                activeTab === tab.id
                  ? 'text-op-gold border-b-2 border-op-gold'
                  : 'text-op-text-secondary hover:text-op-text'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Message */}
        {message && (
          <div
            className={`mb-6 p-4 rounded-lg ${
              message.type === 'success'
                ? 'bg-green-900/20 border border-green-700 text-green-400'
                : 'bg-red-900/20 border border-red-700 text-red-400'
            }`}
          >
            {message.text}
          </div>
        )}

        {/* Profile Tab */}
        {activeTab === 'profile' && (
          <div className="space-y-6">
            <div className="bg-op-surface border border-op-border rounded-lg p-4 sm:p-6">
              <h2 className="text-xl font-bold mb-4">프로필 정보</h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">닉네임</label>
                  <input
                    type="text"
                    value="현재닉네임"
                    disabled
                    className="w-full bg-op-bg border border-op-border rounded px-4 py-2 text-op-text-secondary cursor-not-allowed"
                  />
                  <p className="text-xs text-op-text-secondary mt-1">
                    닉네임 변경은 관리자에게 문의하세요
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    자기소개 ({bio.length}/200)
                  </label>
                  <textarea
                    value={bio}
                    onChange={(e) => setBio(e.target.value.slice(0, 200))}
                    placeholder="자기소개를 입력하세요"
                    rows={4}
                    className="w-full bg-op-bg border border-op-border rounded px-4 py-2 text-op-text focus:border-op-gold outline-none resize-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">아바타 URL</label>
                  <input
                    type="text"
                    value={avatarUrl}
                    onChange={(e) => setAvatarUrl(e.target.value)}
                    placeholder="https://example.com/avatar.jpg"
                    className="w-full bg-op-bg border border-op-border rounded px-4 py-2 text-op-text focus:border-op-gold outline-none"
                  />
                  {avatarUrl && (
                    <div className="mt-2">
                      <img
                        src={avatarUrl}
                        alt="Avatar preview"
                        className="w-20 h-20 rounded-full object-cover border border-op-border"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                        }}
                      />
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">배너 URL</label>
                  <input
                    type="text"
                    value={bannerUrl}
                    onChange={(e) => setBannerUrl(e.target.value)}
                    placeholder="https://example.com/banner.jpg"
                    className="w-full bg-op-bg border border-op-border rounded px-4 py-2 text-op-text focus:border-op-gold outline-none"
                  />
                  {bannerUrl && (
                    <div className="mt-2">
                      <img
                        src={bannerUrl}
                        alt="Banner preview"
                        className="w-full h-32 rounded object-cover border border-op-border"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                        }}
                      />
                    </div>
                  )}
                </div>
              </div>

              <button
                onClick={handleProfileSave}
                disabled={loading}
                className="mt-6 bg-op-gold hover:bg-op-gold-hover disabled:bg-op-elevated disabled:text-op-text-muted text-op-bg font-medium px-6 py-2 rounded flex items-center gap-2 transition-colors"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    저장 중...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    저장
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Notifications Tab */}
        {activeTab === 'notifications' && (
          <div className="space-y-6">
            <div className="bg-op-surface border border-op-border rounded-lg p-4 sm:p-6">
              <h2 className="text-xl font-bold mb-4">알림 설정</h2>

              <div className="space-y-4">
                <ToggleSwitch
                  label="댓글 알림"
                  description="내 게시글에 댓글이 달릴 때 알림을 받습니다"
                  checked={notifyComments}
                  onChange={setNotifyComments}
                />
                <ToggleSwitch
                  label="좋아요 알림"
                  description="내 게시글이나 댓글에 좋아요가 눌릴 때 알림을 받습니다"
                  checked={notifyLikes}
                  onChange={setNotifyLikes}
                />
                <ToggleSwitch
                  label="팔로우 알림"
                  description="다른 사용자가 나를 팔로우할 때 알림을 받습니다"
                  checked={notifyFollows}
                  onChange={setNotifyFollows}
                />
                <ToggleSwitch
                  label="멘션 알림"
                  description="다른 사용자가 나를 멘션할 때 알림을 받습니다"
                  checked={notifyMentions}
                  onChange={setNotifyMentions}
                />
                <ToggleSwitch
                  label="온라인 상태 표시"
                  description="다른 사용자에게 내 온라인 상태를 표시합니다"
                  checked={showOnlineStatus}
                  onChange={setShowOnlineStatus}
                />
              </div>

              <button
                onClick={handleNotificationsSave}
                disabled={loading}
                className="mt-6 bg-op-gold hover:bg-op-gold-hover disabled:bg-op-elevated disabled:text-op-text-muted text-op-bg font-medium px-6 py-2 rounded flex items-center gap-2 transition-colors"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    저장 중...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    저장
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Shop Tab */}
        {activeTab === 'shop' && (
          <div className="space-y-6">
            {/* Points display */}
            <div className="bg-op-surface border border-op-gold/30 rounded-lg p-4 flex items-center justify-between">
              <span className="text-op-text-secondary">보유 포인트</span>
              <span className="text-2xl font-bold text-op-gold">{shopPoints.toLocaleString()}P</span>
            </div>

            {/* Custom Title Section */}
            <div className="bg-op-surface border border-op-border rounded-lg p-4 sm:p-6">
              <div className="flex items-center gap-2 mb-4">
                <Type className="w-5 h-5 text-op-gold" />
                <h2 className="text-xl font-bold">커스텀 타이틀</h2>
              </div>

              {currentTitle && (
                <div className="mb-4 p-3 bg-op-bg rounded border border-op-border">
                  <span className="text-sm text-op-text-secondary">현재 타이틀: </span>
                  <span className="text-op-gold font-medium">{currentTitle}</span>
                </div>
              )}

              <div className="flex gap-3">
                <input
                  type="text"
                  value={customTitle}
                  onChange={(e) => setCustomTitle(e.target.value.slice(0, 20))}
                  placeholder="새 타이틀 입력 (2~20자)"
                  className="flex-1 bg-op-bg border border-op-border rounded px-4 py-2 text-op-text focus:border-op-gold outline-none"
                />
                <button
                  onClick={handleTitlePurchase}
                  disabled={loading || customTitle.trim().length < 2}
                  className="bg-op-gold hover:bg-op-gold-hover disabled:bg-op-elevated disabled:text-op-text-muted text-op-bg font-medium px-4 py-2 rounded whitespace-nowrap transition-colors"
                >
                  {loading ? '처리 중...' : '500P로 변경'}
                </button>
              </div>
              <p className="text-xs text-op-text-secondary mt-2">
                커스텀 타이틀은 프로필에 표시됩니다. 변경 시 500P가 차감됩니다.
              </p>
            </div>

            {/* Badge Shop Section */}
            <div className="bg-op-surface border border-op-border rounded-lg p-4 sm:p-6">
              <div className="flex items-center gap-2 mb-4">
                <Award className="w-5 h-5 text-op-gold" />
                <h2 className="text-xl font-bold">뱃지 상점</h2>
              </div>

              {/* Category Tabs */}
              <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
                {categories.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setActiveCategory(cat)}
                    className={`px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                      activeCategory === cat
                        ? 'bg-op-gold text-op-bg'
                        : 'bg-op-elevated text-op-text-secondary hover:bg-op-border'
                    }`}
                  >
                    {cat === 'all' ? '전체' : CATEGORY_LABELS[cat] || cat}
                  </button>
                ))}
              </div>

              {shopLoading ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-op-gold" />
                </div>
              ) : filteredBadges.length === 0 ? (
                <div className="text-center py-12 text-op-text-secondary">
                  이 카테고리에 뱃지가 없습니다
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {filteredBadges.map((badge) => (
                    <div
                      key={badge.id}
                      className={`border rounded-lg p-4 ${RARITY_COLORS[badge.rarity] || 'border-op-border'} bg-op-bg`}
                    >
                      <div className="flex items-start gap-3">
                        <div className="w-12 h-12 rounded-lg bg-op-elevated flex items-center justify-center text-2xl flex-shrink-0 overflow-hidden">
                          <img
                            src={badge.iconUrl}
                            alt={badge.nameKo}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              e.currentTarget.style.display = 'none';
                              e.currentTarget.parentElement!.textContent = '🏅';
                            }}
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-bold truncate">{badge.nameKo}</span>
                            <span className={`text-xs px-1.5 py-0.5 rounded ${RARITY_COLORS[badge.rarity] || ''} border`}>
                              {RARITY_LABELS[badge.rarity] || badge.rarity}
                            </span>
                          </div>
                          {badge.descriptionKo && (
                            <p className="text-sm text-op-text-secondary mt-1 line-clamp-2">
                              {badge.descriptionKo}
                            </p>
                          )}
                          <div className="flex items-center justify-between mt-3">
                            <span className="text-op-gold font-medium text-sm">
                              {badge.price.toLocaleString()}P
                            </span>
                            {badge.owned ? (
                              <span className="text-green-400 text-sm font-medium px-3 py-1 bg-green-900/20 rounded">
                                보유 중
                              </span>
                            ) : (
                              <button
                                onClick={() => handleBadgePurchase(badge.id)}
                                disabled={loading || shopPoints < badge.price}
                                className="bg-op-gold hover:bg-op-gold-hover disabled:bg-op-elevated disabled:text-op-text-muted text-op-bg text-sm font-medium px-3 py-1 rounded transition-colors"
                              >
                                구매
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Account Tab */}
        {activeTab === 'account' && (
          <div className="space-y-6">
            <div className="bg-op-surface border border-op-border rounded-lg p-4 sm:p-6">
              <h2 className="text-xl font-bold mb-4">비밀번호 변경</h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">현재 비밀번호</label>
                  <input
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className="w-full bg-op-bg border border-op-border rounded px-4 py-2 text-op-text focus:border-op-gold outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">새 비밀번호</label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full bg-op-bg border border-op-border rounded px-4 py-2 text-op-text focus:border-op-gold outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">새 비밀번호 확인</label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full bg-op-bg border border-op-border rounded px-4 py-2 text-op-text focus:border-op-gold outline-none"
                  />
                </div>
              </div>

              <button
                onClick={handlePasswordChange}
                disabled={loading || !currentPassword || !newPassword || !confirmPassword}
                className="mt-6 bg-op-gold hover:bg-op-gold-hover disabled:bg-op-elevated disabled:text-op-text-muted text-op-bg font-medium px-6 py-2 rounded transition-colors"
              >
                {loading ? '변경 중...' : '비밀번호 변경'}
              </button>
            </div>

            <div className="bg-op-surface border border-red-700 rounded-lg p-4 sm:p-6">
              <h2 className="text-xl font-bold mb-2 text-red-400">위험 구역</h2>
              <p className="text-sm text-op-text-secondary mb-4">
                회원탈퇴 시 모든 데이터가 삭제되며 복구할 수 없습니다.
              </p>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium mb-2 text-red-400">비밀번호 확인</label>
                  <input
                    type="password"
                    value={deletePassword}
                    onChange={(e) => setDeletePassword(e.target.value)}
                    placeholder="현재 비밀번호를 입력하세요"
                    className="w-full bg-op-bg border border-red-700/50 rounded px-4 py-2 text-op-text focus:border-red-500 outline-none"
                  />
                </div>
                <button
                  onClick={async () => {
                    if (!deletePassword) {
                      setMessage({ type: 'error', text: '비밀번호를 입력해주세요' });
                      return;
                    }
                    if (!confirm('정말로 회원탈퇴 하시겠습니까? 이 작업은 되돌릴 수 없습니다.')) {
                      return;
                    }
                    setLoading(true);
                    setMessage(null);
                    const result = await deleteAccount(deletePassword);
                    setLoading(false);
                    if (result.success) {
                      router.push('/');
                    } else {
                      setMessage({ type: 'error', text: result.error || '오류가 발생했습니다' });
                    }
                  }}
                  disabled={loading || !deletePassword}
                  className="bg-red-900/20 hover:bg-red-900/30 border border-red-700 text-red-400 font-medium px-6 py-2 rounded transition-colors disabled:opacity-50"
                >
                  {loading ? '처리 중...' : '회원탈퇴'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function ToggleSwitch({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-op-border last:border-0">
      <div className="flex-1">
        <div className="font-medium">{label}</div>
        <div className="text-sm text-op-text-secondary mt-1">{description}</div>
      </div>
      <button
        onClick={() => onChange(!checked)}
        className={`relative w-12 h-6 rounded-full transition-colors ${
          checked ? 'bg-op-gold' : 'bg-op-border'
        }`}
      >
        <div
          className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${
            checked ? 'left-7' : 'left-1'
          }`}
        />
      </button>
    </div>
  );
}
