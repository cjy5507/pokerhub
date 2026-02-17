'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Save, Loader2 } from 'lucide-react';
import { getUserSettings, updateUserSettings, updateProfile, changePassword } from '../actions';

type Tab = 'profile' | 'notifications' | 'account';

export default function SettingsPage() {
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

  useEffect(() => {
    loadSettings();
  }, []);

  async function loadSettings() {
    const result = await getUserSettings();
    if (result.success && result.settings) {
      setNotifyComments(result.settings.notifyComments);
      setNotifyLikes(result.settings.notifyLikes);
      setNotifyFollows(result.settings.notifyFollows);
      setNotifyMentions(result.settings.notifyMentions);
      setShowOnlineStatus(result.settings.showOnlineStatus);
    }
  }

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

  const tabs = [
    { id: 'profile' as const, label: '프로필' },
    { id: 'notifications' as const, label: '알림' },
    { id: 'account' as const, label: '계정' },
  ];

  return (
    <div className="min-h-screen bg-[#121212] text-[#e0e0e0]">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-8">설정</h1>

        {/* Tabs */}
        <div className="flex gap-2 mb-8 border-b border-[#333]">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-6 py-3 font-medium transition-colors ${
                activeTab === tab.id
                  ? 'text-[#c9a227] border-b-2 border-[#c9a227]'
                  : 'text-[#a0a0a0] hover:text-[#e0e0e0]'
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
            <div className="bg-[#1e1e1e] border border-[#333] rounded-lg p-6">
              <h2 className="text-xl font-bold mb-4">프로필 정보</h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">닉네임</label>
                  <input
                    type="text"
                    value="현재닉네임"
                    disabled
                    className="w-full bg-[#121212] border border-[#333] rounded px-4 py-2 text-[#a0a0a0] cursor-not-allowed"
                  />
                  <p className="text-xs text-[#a0a0a0] mt-1">
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
                    className="w-full bg-[#121212] border border-[#333] rounded px-4 py-2 text-[#e0e0e0] focus:border-[#c9a227] outline-none resize-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">아바타 URL</label>
                  <input
                    type="text"
                    value={avatarUrl}
                    onChange={(e) => setAvatarUrl(e.target.value)}
                    placeholder="https://example.com/avatar.jpg"
                    className="w-full bg-[#121212] border border-[#333] rounded px-4 py-2 text-[#e0e0e0] focus:border-[#c9a227] outline-none"
                  />
                  {avatarUrl && (
                    <div className="mt-2">
                      <img
                        src={avatarUrl}
                        alt="Avatar preview"
                        className="w-20 h-20 rounded-full object-cover border border-[#333]"
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
                    className="w-full bg-[#121212] border border-[#333] rounded px-4 py-2 text-[#e0e0e0] focus:border-[#c9a227] outline-none"
                  />
                  {bannerUrl && (
                    <div className="mt-2">
                      <img
                        src={bannerUrl}
                        alt="Banner preview"
                        className="w-full h-32 rounded object-cover border border-[#333]"
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
                className="mt-6 bg-[#c9a227] hover:bg-[#b89220] disabled:bg-[#333] disabled:text-[#888] text-[#121212] font-medium px-6 py-2 rounded flex items-center gap-2 transition-colors"
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
            <div className="bg-[#1e1e1e] border border-[#333] rounded-lg p-6">
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
                className="mt-6 bg-[#c9a227] hover:bg-[#b89220] disabled:bg-[#333] disabled:text-[#888] text-[#121212] font-medium px-6 py-2 rounded flex items-center gap-2 transition-colors"
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

        {/* Account Tab */}
        {activeTab === 'account' && (
          <div className="space-y-6">
            <div className="bg-[#1e1e1e] border border-[#333] rounded-lg p-6">
              <h2 className="text-xl font-bold mb-4">비밀번호 변경</h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">현재 비밀번호</label>
                  <input
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className="w-full bg-[#121212] border border-[#333] rounded px-4 py-2 text-[#e0e0e0] focus:border-[#c9a227] outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">새 비밀번호</label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full bg-[#121212] border border-[#333] rounded px-4 py-2 text-[#e0e0e0] focus:border-[#c9a227] outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">새 비밀번호 확인</label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full bg-[#121212] border border-[#333] rounded px-4 py-2 text-[#e0e0e0] focus:border-[#c9a227] outline-none"
                  />
                </div>
              </div>

              <button
                onClick={handlePasswordChange}
                disabled={loading || !currentPassword || !newPassword || !confirmPassword}
                className="mt-6 bg-[#c9a227] hover:bg-[#b89220] disabled:bg-[#333] disabled:text-[#888] text-[#121212] font-medium px-6 py-2 rounded transition-colors"
              >
                {loading ? '변경 중...' : '비밀번호 변경'}
              </button>
            </div>

            <div className="bg-[#1e1e1e] border border-red-700 rounded-lg p-6">
              <h2 className="text-xl font-bold mb-2 text-red-400">위험 구역</h2>
              <p className="text-sm text-[#a0a0a0] mb-4">
                회원탈퇴 시 모든 데이터가 삭제되며 복구할 수 없습니다.
              </p>
              <button
                onClick={() => {
                  if (confirm('정말로 회원탈퇴 하시겠습니까? 이 작업은 되돌릴 수 없습니다.')) {
                    setMessage({ type: 'error', text: '회원탈퇴 기능은 구현 예정입니다' });
                  }
                }}
                className="bg-red-900/20 hover:bg-red-900/30 border border-red-700 text-red-400 font-medium px-6 py-2 rounded transition-colors"
              >
                회원탈퇴
              </button>
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
    <div className="flex items-center justify-between py-3 border-b border-[#333] last:border-0">
      <div className="flex-1">
        <div className="font-medium">{label}</div>
        <div className="text-sm text-[#a0a0a0] mt-1">{description}</div>
      </div>
      <button
        onClick={() => onChange(!checked)}
        className={`relative w-12 h-6 rounded-full transition-colors ${
          checked ? 'bg-[#c9a227]' : 'bg-[#333]'
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
