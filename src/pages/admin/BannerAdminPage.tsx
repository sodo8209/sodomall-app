// src/pages/admin/BannerAdminPage.tsx
// 이 파일은 이전 개선 버전과 동일합니다.

import React, { useState, useEffect, useCallback } from 'react';
import {
  addBanner,
  updateBanner,
  deleteBanner,
  getAllBanners,
  updateBannerOrderBatch
} from '../../firebase';
import type { Banner } from '../../types';

import BannerForm from './components/BannerForm';
import BannerList from './components/BannerList';
import Notification from './components/Notification';
import './BannerAdminPage.css';

const BannerAdminPage: React.FC = () => {
  const [banners, setBanners] = useState<Banner[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentBanner, setCurrentBanner] = useState<Banner | null>(null);

  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  const showNotification = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setNotification({ message, type });
  };

  const fetchBanners = useCallback(async () => {
    setLoading(true);
    try {
      const fetchedBanners = await getAllBanners();
      setBanners(fetchedBanners.sort((a, b) => (a.order || 0) - (b.order || 0)));
    } catch (err) {
      console.error("배너 로딩 오류:", err);
      setError("배너 목록을 불러오는 데 실패했습니다.");
      showNotification("배너 목록 로딩 실패", "error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBanners();
  }, [fetchBanners]);

  const resetForm = () => {
    setCurrentBanner(null);
  };

  const handleFormSubmit = async (formData: Omit<Banner, 'id' | 'imageUrl'>, imageFile?: File | null) => {
    setIsSubmitting(true);
    try {
      if (currentBanner) {
        // 수정 모드
        const dataToUpdate = {
          linkTo: formData.linkTo,
          isActive: formData.isActive,
          createdAt: formData.createdAt,
          order: formData.order,
        };
        await updateBanner(currentBanner.id, dataToUpdate, imageFile || undefined);
        showNotification('배너가 성공적으로 수정되었습니다.', 'success');
      } else {
        // 추가 모드 - 새 배너는 항상 마지막 순서로 추가
        if (!imageFile) {
            showNotification('새 배너를 추가하려면 이미지를 반드시 선택해야 합니다.', 'error');
            setIsSubmitting(false);
            return;
        }
        const newOrder = banners.length > 0 ? Math.max(...banners.map((b: Banner) => b.order || 0)) + 1 : 0;
        
        const dataToAdd = {
          ...formData,
          order: newOrder,
        };
        await addBanner(dataToAdd, imageFile);
        showNotification('배너가 성공적으로 추가되었습니다.', 'success');
      }
      resetForm();
      await fetchBanners();
    } catch (err) {
      console.error("배너 저장 실패:", err);
      showNotification(`오류: ${(err as Error).message}`, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditClick = (banner: Banner) => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    setCurrentBanner(banner);
  };

  const handleDeleteClick = async (bannerId: string) => {
    if (window.confirm("정말로 이 배너를 삭제하시겠습니까? 관련 이미지도 삭제됩니다.")) {
      try {
        await deleteBanner(bannerId);
        showNotification('배너가 성공적으로 삭제되었습니다.', 'success');
        if (currentBanner?.id === bannerId) {
          resetForm();
        }
        await fetchBanners();
      } catch (err) {
        console.error("배너 삭제 실패:", err);
        showNotification(`삭제 중 오류 발생: ${(err as Error).message}`, 'error');
      }
    }
  };

  const handleToggleActive = async (banner: Banner) => {
    try {
      const dataToUpdate = {
        isActive: !banner.isActive,
        createdAt: banner.createdAt,
        linkTo: banner.linkTo,
        order: banner.order
      };
      await updateBanner(banner.id, dataToUpdate);
      showNotification(`배너가 ${!banner.isActive ? '활성화' : '비활성화'}되었습니다.`, 'info');
      await fetchBanners();
    } catch (err) {
      console.error('배너 상태 변경 실패:', err);
      showNotification(`상태 변경 중 오류 발생: ${(err as Error).message}`, 'error');
    }
  };

  const handleReorder = async (activeId: string, overId: string | null) => {
    if (!overId || activeId === overId) return;

    const oldIndex = banners.findIndex((b: Banner) => b.id === activeId);
    const newIndex = banners.findIndex((b: Banner) => b.id === overId);

    if (oldIndex === -1 || newIndex === -1) return;

    const newBanners = Array.from(banners);
    const [movedItem] = newBanners.splice(oldIndex, 1);
    newBanners.splice(newIndex, 0, movedItem);
    setBanners(newBanners);

    try {
      const orderUpdates = newBanners.map((banner: Banner, index: number) => ({
        id: banner.id,
        order: index,
      }));
      await updateBannerOrderBatch(orderUpdates);
      showNotification('배너 순서가 성공적으로 저장되었습니다.', 'success');
      await fetchBanners();
    } catch (err) {
        console.error('배너 순서 업데이트 실패:', err);
        showNotification('순서 업데이트 중 오류가 발생했습니다. 페이지를 새로고침 해주세요.', 'error');
        await fetchBanners();
    }
  };

  if (loading && banners.length === 0) return <div>배너 목록을 불러오는 중...</div>;
  if (error && banners.length === 0) return <div>오류: {error}</div>;

  return (
    <div className="banner-admin-page-container">
      {notification && <Notification {...notification} onClose={() => setNotification(null)} />}
      <h1>배너 관리</h1>
      <div className="admin-page-grid-container">
        <BannerForm
          currentBanner={currentBanner}
          isSubmitting={isSubmitting}
          onSubmit={handleFormSubmit}
          onReset={resetForm}
        />
        <BannerList
          banners={banners}
          currentBannerId={currentBanner?.id || null}
          onEdit={handleEditClick}
          onDelete={handleDeleteClick}
          onToggleActive={handleToggleActive}
          onReorder={handleReorder}
        />
      </div>
    </div>
  );
};

export default BannerAdminPage;