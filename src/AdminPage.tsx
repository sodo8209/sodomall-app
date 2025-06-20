// src/AdminPage.tsx

import React, { useState, useEffect } from "react";
import { getFunctions, httpsCallable } from "firebase/functions";
import { collection, addDoc } from "firebase/firestore";
import { db } from "./firebase";
import './App.css';

// --- 타입 정의 ---
interface GroupBuyInfo {
  productName: string;
  price: number;
  expirationDate: string | null;
  arrivalDate: string | null;
  tags: string[];
  description: string;
}
interface OrderSlipItem {
  productName: string;
  quantity: number;
  supplyPrice: number;
  totalAmount: number;
}

// --- UI 컴포넌트: 이미지/텍스트 업로더 ---
const UploaderSection = ({ title, description, onAnalyze, analyzing, children }: { title: string, description: string, onAnalyze: () => void, analyzing: boolean, children: React.ReactNode }) => (
  <div className="product-card" style={{ flexDirection: 'column', alignItems: 'flex-start' }}>
    <h2>{title}</h2>
    <p>{description}</p>
    {children}
    <button onClick={onAnalyze} disabled={analyzing} className="add-to-cart-btn" style={{ marginTop: '1rem' }}>
      {analyzing ? '분석 중...' : '분석 실행'}
    </button>
  </div>
);

// --- 메인 관리자 페이지 컴포넌트 ---
const AdminPage = () => {
  const [groupBuyImageFile, setGroupBuyImageFile] = useState<File | null>(null);
  const [groupBuyText, setGroupBuyText] = useState("");
  const [orderSlipImageFile, setOrderSlipImageFile] = useState<File | null>(null);
  
  const [groupBuyResult, setGroupBuyResult] = useState<GroupBuyInfo | null>(null);
  const [orderSlipResult, setOrderSlipResult] = useState<OrderSlipItem[]>([]);

  // --- 상품 등록 폼을 위한 상태 ---
  const [formState, setFormState] = useState({
    title: "",
    price: "",
    info: "",
    incomingDate: "",
    uploadedDate: new Date().toISOString().split('T')[0],
  });

  const [loadingState, setLoadingState] = useState({ groupBuy: false, orderSlip: false, saving: false });
  const [error, setError] = useState<string | null>(null);

  // --- AI 분석 결과를 폼 상태에 자동으로 채워주는 기능 ---
  useEffect(() => {
    if (groupBuyResult) {
      setFormState({
        title: groupBuyResult.productName || "",
        price: groupBuyResult.price?.toString() || "",
        info: groupBuyResult.description || "",
        // AI가 날짜를 '6/25' 형태로 주면 'YYYY-MM-DD'로 변환 시도
        incomingDate: groupBuyResult.arrivalDate ? `2025-${groupBuyResult.arrivalDate.replace('/', '-')}` : "",
        uploadedDate: new Date().toISOString().split('T')[0],
      });
    }
  }, [groupBuyResult]);

  const toBase64 = (file: File) => new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result?.toString().split(',')[1] || "");
    reader.onerror = error => reject(error);
  });
  
  const callFirebaseFunction = async (functionName: string, data: any) => {
    setError(null);
    try {
      const functions = getFunctions();
      const callableFunction = httpsCallable(functions, functionName);
      const result: any = await callableFunction(data);
      return result.data;
    } catch (err: any) {
      console.error(`Error calling ${functionName}:`, err);
      setError(err.message || `Failed to execute ${functionName}.`);
      return null;
    }
  };
  
  const handleAnalyzeGroupBuy = async () => {
    setLoadingState(prev => ({ ...prev, groupBuy: true }));
    let data: { imageBase64?: string, text?: string } = {};
    if (groupBuyImageFile) {
      data.imageBase64 = await toBase64(groupBuyImageFile);
    } else if (groupBuyText) {
      data.text = groupBuyText;
    } else {
      alert("분석할 이미지나 텍스트를 입력해주세요.");
      setLoadingState(prev => ({ ...prev, groupBuy: false }));
      return;
    }
    const result = await callFirebaseFunction('analyzeGroupBuy', data);
    if(result) setGroupBuyResult(result);
    setLoadingState(prev => ({ ...prev, groupBuy: false }));
  };
  
  const handleAnalyzeOrderSlip = async () => {
    if (!orderSlipImageFile) return;
    setLoadingState(prev => ({ ...prev, orderSlip: true }));
    const imageBase64 = await toBase64(orderSlipImageFile);
    const result = await callFirebaseFunction('analyzeOrderSlip', { imageBase64 });
    if(result) setOrderSlipResult(result);
    setLoadingState(prev => ({ ...prev, orderSlip: false }));
  };

  const handleSaveProduct = async () => {
    if (!formState.title || !formState.price || !formState.incomingDate) {
      alert("상품명, 가격, 입고일을 모두 입력해주세요.");
      return;
    }
    setLoadingState(prev => ({ ...prev, saving: true }));
    try {
      await addDoc(collection(db, "products"), {
        title: formState.title,
        price: Number(formState.price),
        info: formState.info,
        incomingDate: formState.incomingDate,
        uploadedDate: formState.uploadedDate,
        stock: 100,
        maxPerUser: 10,
        imageUrl: `https://placehold.co/100x100?text=${encodeURIComponent(formState.title)}`,
      });
      alert("상품이 성공적으로 데이터베이스에 등록되었습니다!");
      setGroupBuyResult(null);
      setFormState({ title: "", price: "", info: "", incomingDate: "", uploadedDate: new Date().toISOString().split('T')[0] });
    } catch (err) {
      console.error("상품 저장 오류:", err);
      alert("상품 저장 중 오류가 발생했습니다.");
    } finally {
      setLoadingState(prev => ({ ...prev, saving: false }));
    }
  };

  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormState(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  return (
    <div className="product-list-container">
      <h1>AI 자동 분석 도구</h1>
      {error && <p style={{ color: 'red', fontWeight: 'bold' }}>오류 발생: {error}</p>}
      
      <UploaderSection 
        title="AI 공구글 분석기"
        description="공동구매 안내글 이미지 또는 텍스트로 상품 정보를 추출합니다."
        onAnalyze={handleAnalyzeGroupBuy}
        analyzing={loadingState.groupBuy}
      >
        <input type="file" accept="image/*" onChange={e => e.target.files && setGroupBuyImageFile(e.target.files[0])} />
        <p style={{textAlign: 'center', width: '100%', margin: '1rem 0'}}> 또는 </p>
        <textarea 
          style={{width: '95%', minHeight: '100px', fontFamily: 'sans-serif', padding: '10px'}}
          placeholder="여기에 공구글 텍스트를 붙여넣으세요..."
          value={groupBuyText}
          onChange={e => setGroupBuyText(e.target.value)}
        />
      </UploaderSection>

      {/* --- 분석 결과 및 등록 폼 --- */}
      {groupBuyResult && (
        <div className="product-card" style={{ flexDirection: 'column', alignItems: 'flex-start', border: '2px solid #007bff' }}>
          <h3>✔️ 분석 결과 (아래 폼에 자동 입력됨)</h3>
          <div style={{width: '100%'}}>
              <label>상품명</label>
              <input type="text" name="title" value={formState.title} onChange={handleFormChange} style={{width: '95%', padding: '8px', marginTop: '5px'}} />
          </div>
          <div style={{width: '100%', marginTop: '1rem'}}>
              <label>가격</label>
              <input type="number" name="price" value={formState.price} onChange={handleFormChange} style={{width: '95%', padding: '8px', marginTop: '5px'}} />
          </div>
          <div style={{width: '100%', marginTop: '1rem'}}>
              <label>설명</label>
              <textarea name="info" value={formState.info} onChange={handleFormChange} style={{width: '95%', minHeight: '80px', padding: '8px', marginTop: '5px'}} />
          </div>
           <div style={{width: '100%', marginTop: '1rem'}}>
              <label>입고 예정일</label>
              <input type="text" name="incomingDate" value={formState.incomingDate} onChange={handleFormChange} placeholder="예: 2025-06-25" style={{width: '95%', padding: '8px', marginTop: '5px'}} />
          </div>
          <button onClick={handleSaveProduct} disabled={loadingState.saving} className="add-to-cart-btn" style={{marginTop: '1rem', backgroundColor: '#28a745'}}>
            {loadingState.saving ? '저장 중...' : '상품 DB에 저장'}
          </button>
        </div>
      )}

      <hr style={{margin: '2rem 0'}}/>

      {/* 발주 전표 분석기는 현재 코드에서 생략 (필요시 추가 가능) */}
    </div>
  );
};

export default AdminPage;