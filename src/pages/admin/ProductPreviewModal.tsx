// src/pages/admin/ProductPreviewModal.tsx

import React from 'react';
import type { PreviewProduct } from '../../types'; 

interface ProductPreviewModalProps {
  product: PreviewProduct; 
  imagePreviews: string[];
  onClose: () => void;
}

const ProductPreviewModal: React.FC<ProductPreviewModalProps> = ({ product, imagePreviews, onClose }) => {
  return (
    <div className="modal-overlay" onClick={onClose} style={modalOverlayStyle}>
      <div className="modal-content-preview" onClick={(e) => e.stopPropagation()} style={modalContentStyle}>
        <div style={headerStyle}>
          <h2>상품 미리보기</h2>
          <button onClick={onClose} style={closeButtonStyle}>X</button>
        </div>
        <div style={bodyStyle}> {/* bodyStyle 적용 */}
          <h3 style={productNameStyle}>{product.name}</h3>
          {product.category && (
            <p style={categoryStyle}>
              카테고리: {product.category}
              {product.subCategory && ` (${product.subCategory})`}
            </p>
          )}
          {imagePreviews && imagePreviews.length > 0 && (
            <div style={imageGalleryStyle}>
              {imagePreviews.map((src, index) => (
                <img key={index} src={src} alt={`미리보기 ${index + 1}`} style={imageStyle} />
              ))}
            </div>
          )}
          <p style={descriptionStyle}>{product.description}</p>
          <div style={pricingOptionListStyle}>
            {product.pricingOptions.map((option, index) => (
              <p key={index} style={pricingOptionStyle}>
                {option.unit}: {option.price.toLocaleString()}원
              </p>
            ))}
          </div>
          {product.specialLabels && product.specialLabels.length > 0 && (
            <div style={labelsStyle}>
              {product.specialLabels.map((label, index) => (
                <span key={index} style={labelChipStyle}>{label}</span>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProductPreviewModal;

// 인라인 스타일 변수들을 컴포넌트 정의 바깥에 선언
const modalOverlayStyle: React.CSSProperties = {
  position: 'fixed',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  backgroundColor: 'rgba(0, 0, 0, 0.7)',
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  zIndex: 10000,
};

const modalContentStyle: React.CSSProperties = {
  backgroundColor: 'white',
  padding: '30px',
  borderRadius: '10px',
  boxShadow: '0 5px 15px rgba(0, 0, 0, 0.3)',
  maxWidth: '600px',
  maxHeight: '90vh',
  overflowY: 'auto',
  position: 'relative',
  width: '90%',
};

const headerStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  borderBottom: '1px solid #eee',
  paddingBottom: '15px',
  marginBottom: '20px',
};

// [추가] bodyStyle 변수 정의
const bodyStyle: React.CSSProperties = {
    // 미리보기 모달 바디의 추가 스타일이 필요하다면 여기에 정의
    // 현재는 단순 컨테이너 역할이므로 특별한 스타일 없음
    // 기존 ProductPreviewModal.css에 있다면 그곳에서 관리
};

const productNameStyle: React.CSSProperties = {
  fontSize: '1.8em',
  fontWeight: 'bold',
  marginBottom: '10px',
};

const categoryStyle: React.CSSProperties = {
  fontSize: '0.9em',
  color: '#666',
  marginBottom: '15px',
};

const descriptionStyle: React.CSSProperties = {
  fontSize: '1em',
  lineHeight: '1.6',
  marginBottom: '20px',
  whiteSpace: 'pre-wrap', 
};

const pricingOptionListStyle: React.CSSProperties = {
  borderTop: '1px solid #eee',
  paddingTop: '15px',
  marginBottom: '20px',
};

const pricingOptionStyle: React.CSSProperties = {
  fontSize: '1.1em',
  marginBottom: '5px',
  fontWeight: 'bold',
  color: '#333',
};

const labelsStyle: React.CSSProperties = {
  display: 'flex',
  flexWrap: 'wrap',
  gap: '10px',
  marginTop: '15px',
};

const labelChipStyle: React.CSSProperties = {
  backgroundColor: '#f0f0f0',
  padding: '5px 10px',
  borderRadius: '20px',
  fontSize: '0.8em',
  fontWeight: 'bold',
  color: '#555',
};

const closeButtonStyle: React.CSSProperties = {
  background: 'none',
  border: 'none',
  fontSize: '1.5em',
  cursor: 'pointer',
  color: '#999',
};

const imageGalleryStyle: React.CSSProperties = {
  display: 'flex',
  overflowX: 'auto',
  gap: '10px',
  marginBottom: '20px',
  paddingBottom: '10px', 
};

const imageStyle: React.CSSProperties = {
  minWidth: '150px',
  height: '150px',
  objectFit: 'cover',
  borderRadius: '8px',
};