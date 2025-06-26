import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Timestamp } from 'firebase/firestore';
import {
  getProductById,
  updateProduct,
  getCategories
} from '../../firebase';
import type { Product, PricingOption, SalesType, Category, PreviewProduct, StorageType } from '../../types';
import ProductPreviewModal from './ProductPreviewModal';

import {
  Edit3, DollarSign, Image as ImageIcon, Tag, Calendar,
  CheckCircle, Clock, Save, PlusCircle, X, Camera, Eye, Check, Minus, FileText, Loader, Info
} from 'lucide-react';
import './ProductAddAdminPage.css'; // ProductAddAdminPage.css 재사용

interface EditablePricingOption extends PricingOption { id: number; }

const salesTypeOptions: { key: SalesType; name: string; description: string; }[] = [
  { key: 'PRE_ORDER_UNLIMITED', name: '일반 예약 판매', description: '기간 내에 주문을 받아 판매합니다.' },
  { key: 'IN_STOCK', name: '재고 한정 판매', description: '미리 확보된 재고만큼만 판매합니다.' },
];

// 보관 타입 옵션 순서 변경: 실온 - 냉동 - 냉장
const storageTypeOptions: { key: StorageType; name: string; color: string; rgb: string; }[] = [
  { key: 'ROOM', name: '실온', color: '#343a40', rgb: '52, 58, 64' },     // 검정
  { key: 'FROZEN', name: '냉동', color: '#007bff', rgb: '0, 123, 255' },   // 파랑 (가운데)
  { key: 'CHILLED', name: '냉장', color: '#dc3545', rgb: '220, 53, 69' }, // 빨강 (오른쪽)
];

const availableLabels = [
  { key: 'LIMITED', name: '수량 한정' },
  { key: 'POPULAR', name: '인기 상품' },
  { key: 'EVENT', name: '이벤트 특가' },
  { key: 'NEW', name: '신상품' },
];

const formatToDateTimeLocal = (date: Date | null): string => {
  if (!date) return '';
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  return `${year}-${month}-${day}T${hours}:${minutes}`;
};

const formatToDate = (date: Date | null): string => {
  if (!date) return '';
  // toISOString()은 UTC 기준으로 반환하므로, 시간대 문제를 방지하려면 수동 포맷
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const SectionCard = ({ icon, title, children }: { icon: React.ReactNode, title: string, children: React.ReactNode }) => (
  <div className="section-card">
    <div className="section-card-header">
      <h3>
        {icon}
        {title}
      </h3>
    </div>
    <div className="section-card-body">{children}</div>
  </div>
);

const LoadingSpinner = () => (
    <div className="loading-overlay">
        <Loader size={48} className="spin" />
        <p>잠시만 기다려 주세요...</p>
    </div>
);

const MessageBanner = ({ message, type }: { message: string | null, type: 'error' | 'success' | 'info' }) => {
    if (!message) return null;
    return (
        <div className={`message-banner ${type}-message-banner`}>
            {type === 'error' && <X size={16} className="icon"/>}
            {type === 'success' && <Check size={16} className="icon"/>}
            {type === 'info' && <Info size={16} className="icon"/>}
            <span>{message}</span>
        </div>
    );
};

const ProductEditAdminPage: React.FC = () => {
  const { productId } = useParams<{ productId: string }>();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [product, setProduct] = useState<Product | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [pricingOptions, setPricingOptions] = useState<EditablePricingOption[]>([]);
  const [imageUrls, setImageUrls] = useState<string[]>([]); // 기존 이미지 URL
  const [imageFiles, setImageFiles] = useState<File[]>([]); // 새로 업로드할 이미지 파일
  const [imagePreviews, setImagePreviews] = useState<string[]>([]); // 이미지 미리보기 (기존 + 새 이미지)
  const [selectedSalesType, setSelectedSalesType] = useState<SalesType>('PRE_ORDER_UNLIMITED');
  const [initialStock, setInitialStock] = useState<number | ''>('');
  const [maxOrderPerPerson, setMaxOrderPerPerson] = useState<number | '' | null>(null);
  const [selectedStorageType, setSelectedStorageType] = useState<StorageType>('ROOM'); // 보관 타입 상태 추가

  const [specialLabels, setSpecialLabels] = useState<string[]>([]);
  const [publishOption, setPublishOption] = useState<'draft' | 'now' | 'schedule'>('now');

  const [scheduledAt, setScheduledAt] = useState<Date>(() => {
    const now = new Date();
    now.setHours(13, 0, 0, 0);
    return now;
  });

  const [deadlineDate, setDeadlineDate] = useState<Date | null>(null);
  const [pickupDay, setPickupDay] = useState<Date | null>(null);
  const [pickupDeadlineDate, setPickupDeadlineDate] = useState<Date | null>(null);
  const [expirationDate, setExpirationDate] = useState<Date | null>(null);

  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedMainCategory, setSelectedMainCategory] = useState<string>('');
  const [selectedSubCategory, setSelectedSubCategory] = useState<string>('');
  const [availableSubCategories, setAvailableSubCategories] = useState<string[]>([]);

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [loadingCategories, setLoadingCategories] = useState(true);
  const [formError, setFormError] = useState<string | null>(null); // 폼 제출 관련 에러
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [categoryLoadError, setCategoryLoadError] = useState<string | null>(null); // 카테고리 로딩 에러
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null); // 상품 수정 성공 메시지

  // 상품 데이터 및 카테고리 로딩
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      setFormError(null);
      setCategoryLoadError(null);

      if (!productId) {
        setFormError("상품 ID가 없습니다.");
        setIsLoading(false);
        setLoadingCategories(false);
        return;
      }

      try {
        const [fetchedProduct, fetchedCategories] = await Promise.all([
          getProductById(productId),
          getCategories()
        ]);

        if (fetchedProduct) {
          setProduct(fetchedProduct);
          setName(fetchedProduct.name);
          setDescription(fetchedProduct.description);
          setPricingOptions(fetchedProduct.pricingOptions?.map((opt: PricingOption, idx: number) => ({ ...opt, id: Date.now() + idx })) || []);
          setImageUrls(fetchedProduct.imageUrls || []);
          setImagePreviews(fetchedProduct.imageUrls || []); // 초기 미리보기는 기존 이미지로 설정
          setSelectedSalesType(fetchedProduct.salesType);
          setInitialStock(fetchedProduct.initialStock === 0 && fetchedProduct.salesType === 'PRE_ORDER_UNLIMITED' ? '' : fetchedProduct.initialStock); // 예약 판매면 빈 값으로
          setMaxOrderPerPerson(fetchedProduct.maxOrderPerPerson ?? null);
          setSpecialLabels(fetchedProduct.specialLabels || []);
          setSelectedStorageType(fetchedProduct.storageType || 'ROOM'); // 기존 보관 타입 로드

          // 발행 옵션 설정
          if (fetchedProduct.status === 'selling') setPublishOption('now');
          else if (fetchedProduct.status === 'scheduled') setPublishOption('schedule');
          else setPublishOption('draft');

          setScheduledAt(fetchedProduct.publishAt?.toDate() || new Date());
          setDeadlineDate(fetchedProduct.deadlineDate?.toDate() || null);
          setPickupDay(fetchedProduct.pickupDate?.toDate() || null);
          setPickupDeadlineDate(fetchedProduct.pickupDeadlineDate?.toDate() || null);
          setExpirationDate(fetchedProduct.expirationDate?.toDate() || null);

          setCategories(fetchedCategories);
          const existingCategory = fetchedCategories.find((cat: Category) => cat.name === fetchedProduct.category);
          if (existingCategory) {
            setSelectedMainCategory(existingCategory.id);
            if (fetchedProduct.subCategory && existingCategory.subCategories.includes(fetchedProduct.subCategory)) {
                setSelectedSubCategory(fetchedProduct.subCategory);
            } else {
                setSelectedSubCategory('');
            }
          } else {
              setSelectedMainCategory('');
              setSelectedSubCategory('');
          }
        } else {
          setFormError('상품을 찾을 수 없습니다.');
        }
      } catch (err) {
        console.error("상품 데이터 불러오기 오류:", err);
        setFormError('상품 데이터 불러오기 중 오류가 발생했습니다.');
      } finally {
        setIsLoading(false);
        setLoadingCategories(false);
      }
    };
    fetchData();
  }, [productId]);

  // 메인 카테고리 변경 시 서브 카테고리 업데이트 및 초기화
  useEffect(() => {
    if (selectedMainCategory) {
      const category = categories.find((cat: Category) => cat.id === selectedMainCategory);
      const newAvailableSubCategories = category ? category.subCategories : [];
      setAvailableSubCategories(newAvailableSubCategories);

      if (!newAvailableSubCategories.includes(selectedSubCategory) && selectedSubCategory !== '') {
        setSelectedSubCategory('');
      }
    } else {
      setAvailableSubCategories([]);
      if (selectedSubCategory !== '') {
        setSelectedSubCategory('');
      }
    }
  }, [selectedMainCategory, categories, selectedSubCategory]);

  // 픽업일 변경 시 픽업 마감일 자동 설정
  useEffect(() => {
    if (pickupDay) {
      const newPickupDeadline = new Date(pickupDay);
      newPickupDeadline.setDate(pickupDay.getDate() + 1);
      newPickupDeadline.setHours(23, 59, 59, 999); // 다음 날 23:59:59.999

      // 기존 pickupDeadlineDate가 null이 아니면서 새로운 날짜와 다르거나,
      // Date 객체가 아닌 Timestamp 객체인 경우에만 업데이트
      if (
        pickupDeadlineDate === null ||
        !(pickupDeadlineDate instanceof Date && newPickupDeadline.toDateString() === pickupDeadlineDate.toDateString())
      ) {
        setPickupDeadlineDate(newPickupDeadline);
      }
    } else {
      if (pickupDeadlineDate !== null) {
        setPickupDeadlineDate(null);
      }
    }
  }, [pickupDay, pickupDeadlineDate]);


  const handlePriceStep = useCallback((id: number, amount: number) => {
    setPricingOptions(o => o.map((opt: EditablePricingOption) => opt.id === id ? { ...opt, price: Math.max(0, opt.price + amount) } : opt));
  }, []);

  const handlePricingChange = useCallback((id: number, field: 'unit' | 'price', value: string) => {
    setPricingOptions(o => o.map((opt: EditablePricingOption) => opt.id === id ? { ...opt, [field]: field === 'price' ? (value === '' ? 0 : Number(value)) : value } : opt));
  }, []);

  const addPricingOption = useCallback(() => {
    setPricingOptions(prev => [...prev, { id: Date.now(), unit: '', price: 0 }]);
  }, []);

  const removePricingOption = useCallback((id: number) => {
    setPricingOptions(prev => prev.filter((opt: EditablePricingOption) => opt.id !== id));
  }, []);

  const handleLabelToggle = useCallback((labelKey: string) => {
    setSpecialLabels(prev => prev.includes(labelKey) ? prev.filter((key: string) => key !== labelKey) : [...prev, labelKey]);
  }, []);

  const handleSelectFileClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const newFiles = Array.from(e.target.files);
    
    const MAX_IMAGE_COUNT = 50;
    if (imagePreviews.length + newFiles.length > MAX_IMAGE_COUNT) {
        setFormError(`이미지는 최대 ${MAX_IMAGE_COUNT}개까지 업로드할 수 있습니다.`);
        e.target.value = '';
        return;
    }

    setImageFiles(prev => [...prev, ...newFiles]);
    newFiles.forEach(file => setImagePreviews(prev => [...prev, URL.createObjectURL(file)]));
    e.target.value = '';
    setFormError(null);
  }, [imagePreviews]);

  const removeImage = useCallback((indexToRemove: number) => {
    // 미리보기 URL 배열에서 제거할 URL을 찾습니다.
    const urlToRemove = imagePreviews[indexToRemove];
    if (!urlToRemove) return;

    // 메모리 누수 방지를 위해 URL.createObjectURL로 생성된 URL은 해제합니다.
    if (urlToRemove.startsWith('blob:')) {
        URL.revokeObjectURL(urlToRemove);
        // imageFiles에서 해당 파일을 제거합니다.
        setImageFiles(prevFiles => prevFiles.filter(file => URL.createObjectURL(file) !== urlToRemove));
    } else {
        // 기존 이미지 URL (Firebase Storage)에서 제거합니다.
        setImageUrls(prevUrls => prevUrls.filter(url => url !== urlToRemove));
    }

    // imagePreviews에서 제거
    setImagePreviews(previews => previews.filter((_, i) => i !== indexToRemove));
  }, [imagePreviews, imageUrls, imageFiles]);


  const handleUpdateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setFormError(null);
    setSubmitSuccess(null);

    if (!productId) {
        setFormError("상품 ID가 없습니다.");
        setIsSaving(false);
        return;
    }
    if (!name.trim()) { setFormError('상품명을 입력해주세요.'); setIsSaving(false); return; }
    if (pricingOptions.some((opt: EditablePricingOption) => !opt.unit.trim() || opt.price <= 0)) { setFormError('가격 정책을 올바르게 설정해주세요 (단위와 가격 모두 필수, 가격은 0원 초과).'); setIsSaving(false); return; }
    // '재고 한정 판매'일 때만 재고량 검사
    if (selectedSalesType === 'IN_STOCK' && (initialStock === '' || Number(initialStock) <= 0)) {
        setFormError('재고 한정 상품은 총 재고량을 0보다 크게 입력해야 합니다.');
        setIsSaving(false);
        return;
    }
    if (imagePreviews.length === 0) { setFormError('상품 이미지를 최소 1개 이상 업로드해주세요.'); setIsSaving(false); return; }
    if (!deadlineDate || !pickupDay || !pickupDeadlineDate) { setFormError('예약 마감일, 픽업일, 픽업 마감일을 모두 선택해주세요.'); setIsSaving(false); return; }
    // 날짜 순서 유효성 검사
    if (deadlineDate && pickupDay && deadlineDate.getTime() >= pickupDay.getTime()) {
        setFormError('예약 마감일은 픽업일보다 이전이어야 합니다.');
        setIsSaving(false);
        return;
    }
    if (pickupDay && pickupDeadlineDate && pickupDay.getTime() > pickupDeadlineDate.getTime()) {
        setFormError('픽업 마감일은 픽업일보다 이후여야 합니다.');
        setIsSaving(false);
        return;
    }


    const publicationTime = (publishOption === 'now' || publishOption === 'draft') ? new Date() : scheduledAt;

    const productStatus: Product['status'] = publishOption === 'now' ? 'selling' : (publishOption === 'schedule' ? 'scheduled' : 'draft');

    try {
      const updatedProductData: Partial<Omit<Product, 'id' | 'createdAt' | 'imageUrls'>> = {
        name: name.trim(),
        description: description.trim(),
        salesType: selectedSalesType,
        // 예약 판매일 경우 재고를 0으로 설정하거나 무한대로 간주
        initialStock: selectedSalesType === 'IN_STOCK' ? (initialStock === '' ? 0 : Number(initialStock)) : 0,
        stock: selectedSalesType === 'IN_STOCK' ? (initialStock === '' ? 0 : Number(initialStock)) : 0,
        pricingOptions: pricingOptions.map(({ id, ...rest }) => rest),
        specialLabels,
        maxOrderPerPerson: maxOrderPerPerson !== '' ? Number(maxOrderPerPerson) : null,
        isPublished: productStatus === 'selling',
        status: productStatus,
        publishAt: Timestamp.fromDate(publicationTime),
        deadlineDate: Timestamp.fromDate(deadlineDate!),
        arrivalDate: Timestamp.fromDate(pickupDay!),
        pickupDate: Timestamp.fromDate(pickupDay!),
        pickupDeadlineDate: pickupDeadlineDate ? Timestamp.fromDate(pickupDeadlineDate) : null,
        expirationDate: expirationDate ? Timestamp.fromDate(expirationDate) : null,
        category: selectedMainCategory ? (categories.find((cat: Category) => cat.id === selectedMainCategory)?.name || '기타') : '',
        subCategory: selectedSubCategory || '',
        storageType: selectedStorageType, // 보관 타입 추가
        encoreCount: product?.encoreCount ?? 0,
        isNew: product?.isNew ?? false, // 수정 시 isNew는 false로 유지하는 것이 합리적
      };

      await updateProduct(productId, updatedProductData, imageFiles, imageUrls);
      setSubmitSuccess(`상품이 성공적으로 수정되었습니다!`);
      setTimeout(() => navigate('/admin/products'), 2000);
    } catch (err) {
      console.error("상품 수정 실패:", err);
      setFormError(`상품 수정 중 오류가 발생했습니다: ${(err as Error).message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const getSubmitButtonText = () => '수정하기';

  if (isLoading) {
    return <LoadingSpinner />;
  }

  if (!product && formError) {
    return (
      <div className="product-add-page-wrapper" style={{ height: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center', flexDirection: 'column' }}>
        <MessageBanner message={formError} type="error" />
        <button onClick={() => navigate('/admin/products')} className="common-button button-preview" style={{ marginTop: '20px' }}>상품 목록으로 돌아가기</button>
      </div>
    );
  }

  if (!product && !formError) { // 상품을 찾을 수 없는데 에러 메시지가 없는 경우
    return (
      <div className="product-add-page-wrapper" style={{ height: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center', flexDirection: 'column' }}>
        <MessageBanner message="상품 정보를 불러오는데 실패했습니다." type="error" />
        <button onClick={() => navigate('/admin/products')} className="common-button button-preview" style={{ marginTop: '20px' }}>상품 목록으로</button>
      </div>
    );
  }


  return (
    <>
      {isPreviewing && (
        <ProductPreviewModal
          product={{
            name,
            description,
            pricingOptions: pricingOptions.map(({ id, ...rest }) => rest),
            specialLabels,
            category: selectedMainCategory ? (categories.find((cat: Category) => cat.id === selectedMainCategory)?.name || '기타') : '',
            subCategory: selectedSubCategory || '',
            // preview modal에 storageType이 필요하다면 여기에 추가
          } as PreviewProduct}
          imagePreviews={imagePreviews}
          onClose={() => setIsPreviewing(false)}
        />
      )}
      <div className="product-add-page-wrapper">
        <div className="product-add-main-content">
          <form onSubmit={handleUpdateProduct} id="product-edit-form">
            <header className="form-top-action-bar">
              <h1>상품 수정</h1>
              <div className="publish-options-and-buttons">
                <div className="publish-option-group">
                   <input type="radio" id="edit-publish-draft" value="draft" name="publishOption" checked={publishOption === 'draft'} onChange={() => setPublishOption('draft')} />
                   <label htmlFor="edit-publish-draft" className="radio-label"><FileText size={16} className="icon"/><span>임시저장</span></label>
                   <input type="radio" id="edit-publish-now" value="now" name="publishOption" checked={publishOption === 'now'} onChange={() => setPublishOption('now')} />
                   <label htmlFor="edit-publish-now" className="radio-label"><CheckCircle size={16} className="icon"/><span>지금 발행</span></label>
                   <input type="radio" id="edit-publish-schedule" value="schedule" name="publishOption" checked={publishOption === 'schedule'} onChange={() => setPublishOption('schedule')} />
                   <label htmlFor="edit-publish-schedule" className="radio-label"><Clock size={16} className="icon"/><span>예약 발행</span></label>
                </div>
                <button type="button" onClick={() => setIsPreviewing(true)} className="common-button button-preview"><Eye size={18} />미리보기</button>
                <button type="submit" disabled={isSaving} className="common-button button-submit"><Save size={18} />{isSaving ? '저장 중...' : getSubmitButtonText()}</button>
              </div>
            </header>
            <main className="main-content-grid">
              <div className="main-content-col">
                <SectionCard icon={<Edit3 size={16} />} title="상품 기본 정보 및 카테고리">
                    <div className="form-group">
                        <label htmlFor="product-name">상품명 *</label>
                        <input id="product-name" type="text" value={name} onChange={e => setName(e.target.value)} required placeholder="고객에게 보여질 상품명을 입력하세요" />
                        <p className="form-field-info">상품의 이름을 명확하게 작성해주세요. 검색 노출에 중요합니다.</p>
                    </div>
                    <div className="form-group">
                        <label htmlFor="product-desc">상세 설명</label>
                        <textarea id="product-desc" value={description} onChange={e => setDescription(e.target.value)} rows={4} placeholder="상품의 특징, 스토리, 주의사항 등을 자유롭게 작성해주세요." />
                        <p className="form-field-info">상품에 대한 자세한 정보는 고객의 구매 결정에 큰 영향을 줍니다.</p>
                    </div>

                    {/* 유통 기한 필드 */}
                    <div className="form-group">
                        <label htmlFor="expiration-date">유통 기한 (선택)</label>
                        <input id="expiration-date" type="date" className="native-date-input" value={formatToDate(expirationDate)} onChange={(e) => setExpirationDate(e.target.value ? new Date(e.target.value) : null)} />
                        <p className="form-field-info">유통 기한이 있는 신선식품 등에만 입력하세요.</p>
                    </div>

                    {/* 보관 타입 선택 라디오 버튼 추가 (ProductAddAdminPage와 동일) */}
                    <div className="form-group">
                      <label>보관 타입 *</label>
                      <div className="storage-type-options">
                        {storageTypeOptions.map((option) => (
                          <label 
                            key={option.key} 
                            className={`storage-type-option ${selectedStorageType === option.key ? 'selected' : ''}`} 
                            style={{ 
                              '--color-accent': option.color,
                              '--color-accent-rgb': option.rgb 
                            } as React.CSSProperties}
                          >
                            <input
                              type="radio"
                              name="storageType"
                              value={option.key}
                              checked={selectedStorageType === option.key}
                              onChange={() => setSelectedStorageType(option.key)}
                            />
                            {option.name}
                          </label>
                        ))}
                      </div>
                      <p className="form-field-info">상품의 보관 방식(실온, 냉장, 냉동)을 선택해주세요.</p>
                    </div>

                    <div className="form-group">
                        <label>판매 방식</label>
                        <div className="sales-type-options">
                            {salesTypeOptions.map((option) => (
                                <div key={option.key} className={`sales-type-option ${selectedSalesType === option.key ? 'selected' : ''}`} onClick={() => setSelectedSalesType(option.key)}>
                                    <h4>{option.name}</h4>
                                    <p>{option.description}</p>
                                </div>
                            ))}
                        </div>
                        <p className="form-field-info">상품이 어떤 방식으로 판매될지 선택해주세요.</p>
                    </div>

                    {loadingCategories ? (
                        <p className="loading-message-inline"><Loader size={16} className="spin-inline"/> 카테고리를 불러오는 중...</p>
                    ) : categoryLoadError ? (
                        <MessageBanner message={categoryLoadError} type="error" />
                    ) : (
                        <>
                            <div className="form-group">
                                <label htmlFor="mainCategorySelect">대분류 카테고리</label>
                                {/* 드롭다운 대신 버튼 형태의 카테고리 선택 UI */}
                                <div className="category-chips-container">
                                    <button
                                        type="button"
                                        className={`category-chip ${selectedMainCategory === '' ? 'selected' : ''}`}
                                        onClick={() => setSelectedMainCategory('')}
                                    >
                                        선택 안함
                                    </button>
                                    {categories.map((cat: Category) => (
                                        <button
                                            key={cat.id}
                                            type="button"
                                            className={`category-chip ${selectedMainCategory === cat.id ? 'selected' : ''}`}
                                            onClick={() => setSelectedMainCategory(cat.id)}
                                        >
                                            {cat.name}
                                        </button>
                                    ))}
                                </div>
                                <p className="form-field-info">상품이 속할 대분류 카테고리를 선택합니다.</p>
                            </div>
                            <div className="form-group">
                                <label htmlFor="subCategorySelect">하위 카테고리</label>
                                <div className="category-chips-container">
                                    <button
                                        type="button"
                                        className={`category-chip ${selectedSubCategory === '' ? 'selected' : ''}`}
                                        onClick={() => setSelectedSubCategory('')}
                                        disabled={!selectedMainCategory}
                                    >
                                        선택 안함
                                    </button>
                                    {availableSubCategories.length > 0 ? (
                                        availableSubCategories.map((subCat: string, index: number) => (
                                            <button
                                                key={index}
                                                type="button"
                                                className={`category-chip ${selectedSubCategory === subCat ? 'selected' : ''}`}
                                                onClick={() => setSelectedSubCategory(subCat)}
                                                disabled={!selectedMainCategory}
                                            >
                                                {subCat}
                                            </button>
                                        ))
                                    ) : (
                                        <p className="form-field-info no-subcategories">대분류를 선택하거나, 하위 카테고리가 없습니다.</p>
                                    )}
                                </div>
                            </div>
                        </>
                    )}
                </SectionCard>

                <SectionCard icon={<ImageIcon size={16} />} title="상품 이미지">
                    <input type="file" ref={fileInputRef} onChange={handleFileChange} multiple accept="image/*" style={{ display: 'none' }} />
                    <button type="button" onClick={handleSelectFileClick} className="common-button add-option-btn" style={{width: '100%', justifyContent: 'center'}}>
                        <Camera size={16}/> 이미지 선택하기
                    </button>
                    {imagePreviews.length > 0 &&
                        <div className="image-previews-grid">
                            {imagePreviews.map((preview: string, index: number) =>
                                <div key={preview + index} className="image-preview-wrapper">
                                    <img src={preview} alt={`미리보기 ${index + 1}`} />
                                    <button type="button" onClick={() => removeImage(index)} className="remove-image-btn"><X size={14}/></button>
                                </div>
                            )}
                        </div>
                    }
                    {imagePreviews.length === 0 && (
                        <MessageBanner message={`상품 이미지를 1개 이상 업로드해주세요. (최대 ${50}개)`} type="info" />
                    )}
                </SectionCard>
              </div>
              <div className="main-content-col">
                <SectionCard icon={<DollarSign size={16} />} title="가격 및 재고">
                    <div className="form-group">
                        <label>가격 정책 *</label>
                        <div className="pricing-options-container">
                            {pricingOptions.map((option: EditablePricingOption) =>
                                <div key={option.id} className="pricing-option-row">
                                    <div className="form-group unit-group">
                                        <input type="text" value={option.unit} onChange={(e) => handlePricingChange(option.id, 'unit', e.target.value)} placeholder="단위 (예: 1박스, 500g)" required/>
                                    </div>
                                    <div className="form-group price-group">
                                        <div className="price-input-wrapper">
                                            <button type="button" onClick={() => handlePriceStep(option.id, -100)}><Minus size={16}/></button>
                                            <input type="number" value={option.price === 0 ? '' : option.price} onChange={(e) => handlePricingChange(option.id, 'price', e.target.value)} placeholder="가격" required/>
                                            <button type="button" onClick={() => handlePriceStep(option.id, 100)}><PlusCircle size={16}/></button>
                                            <span>원</span>
                                        </div>
                                    </div>
                                    {pricingOptions.length > 1 && (<button type="button" onClick={() => removePricingOption(option.id)} className="remove-btn"><X size={18}/></button>)}
                                </div>
                            )}
                            <button type="button" onClick={addPricingOption} className="common-button add-option-btn"><PlusCircle size={16}/> 가격 옵션 추가</button>
                        </div>
                        <p className="form-field-info">다양한 옵션(예: 낱개, 묶음)으로 가격을 설정할 수 있습니다. 가격은 0원 초과.</p>
                    </div>
                    {selectedSalesType === 'IN_STOCK' &&
                        <div className="form-group">
                            <label htmlFor="initial-stock">총 재고량 *</label>
                            <input id="initial-stock" type="number" value={initialStock} onChange={e => setInitialStock(e.target.value === '' ? '' : Number(e.target.value))} required={selectedSalesType === 'IN_STOCK'} min="0" placeholder="0보다 큰 재고량을 입력하세요"/>
                            <p className="form-field-info">현재 판매 가능한 총 상품 재고 수량입니다.</p>
                        </div>
                    }
                    <div className="form-group">
                        <label htmlFor="max-order">1인당 최대 구매 수량</label>
                        <input id="max-order" type="number" value={maxOrderPerPerson !== null ? maxOrderPerPerson : ''} onChange={e => setMaxOrderPerPerson(e.target.value === '' ? null : Number(e.target.value))} min="1" placeholder="제한 없으면 비워두세요"/>
                        <p className="form-field-info">한 사람이 최대로 구매할 수 있는 수량을 설정합니다. (제한 없음 시 비워두세요)</p>
                    </div>
                </SectionCard>

                <SectionCard icon={<Calendar size={16} />} title="일정 관리">
                    {publishOption === 'schedule' &&
                        <div className="form-group">
                            <label htmlFor="scheduled-at">발행 예약 시간 *</label>
                            <input
                                id="scheduled-at"
                                type="datetime-local"
                                className="native-date-input"
                                value={formatToDateTimeLocal(scheduledAt)}
                                onChange={(e) => setScheduledAt(e.target.value ? new Date(e.target.value) : new Date())}
                                required
                            />
                            <p className="form-field-info">상품이 자동으로 공개될 날짜와 시간을 설정합니다.</p>
                        </div>
                    }
                    <div className="form-group">
                        <label htmlFor="deadline-date">예약 마감일 *</label>
                        <input
                            id="deadline-date"
                            type="datetime-local"
                            className="native-date-input"
                            value={formatToDateTimeLocal(deadlineDate)}
                            onChange={(e) => setDeadlineDate(e.target.value ? new Date(e.target.value) : null)}
                            required
                        />
                        <p className="form-field-info">상품 주문이 가능한 마지막 날짜와 시간입니다.</p>
                    </div>
                    {/* 픽업일 / 픽업 마감일 가로 정렬 */}
                    <div className="pickup-dates-group">
                        <div className="form-group">
                            <label htmlFor="pickup-day">픽업일 *</label>
                            <input id="pickup-day" type="date" className="native-date-input" value={formatToDate(pickupDay)} onChange={(e) => setPickupDay(e.target.value ? new Date(e.target.value) : null)} required/>
                            <p className="form-field-info">상품을 수령할 수 있는 시작 날짜입니다.</p>
                        </div>
                        <div className="form-group">
                            <label htmlFor="pickup-deadline">픽업 마감일 *</label>
                            <input
                                id="pickup-deadline"
                                type="date"
                                className="native-date-input"
                                value={formatToDate(pickupDeadlineDate)}
                                onChange={(e) => setPickupDeadlineDate(e.target.value ? new Date(e.target.value) : null)}
                                required
                            />
                            <p className="form-field-info">상품 픽업이 가능한 마지막 날짜입니다. (픽업일 다음 날로 자동 설정)</p>
                        </div>
                    </div>
                </SectionCard>

                <SectionCard icon={<Tag size={16} />} title="특별 라벨">
                    <div className="label-options">
                        {availableLabels.map((label) =>
                            <div key={label.key}
                                className={`label-chip ${specialLabels.includes(label.key) ? 'selected' : ''}`}
                                onClick={() => handleLabelToggle(label.key)}
                                data-label={label.key}
                            >
                                {label.name}
                                {specialLabels.includes(label.key) && <Check size={14} className="label-check-icon" />}
                            </div>
                        )}
                    </div>
                    <p className="form-field-info">상품에 특별한 속성을 표시합니다. (예: 한정 수량, 신상품)</p>
                </SectionCard>
              </div>
            </main>
          </form>
        </div>
        {isSaving && <LoadingSpinner />}
        {formError && <MessageBanner message={formError} type="error" />}
        {submitSuccess && <MessageBanner message={submitSuccess} type="success" />}
      </div>
    </>
  );
};

export default ProductEditAdminPage;