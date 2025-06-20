// functions/index.js

const functions = require("firebase-functions");
const { GoogleGenerativeAI } = require("@google/generative-ai");

// --- 공통 설정 ---
// 최신 모델 이름으로 변경합니다.
const genAI = new GoogleGenerativeAI(functions.config().gemini.key);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash-latest" });

// --- 1. 공구 안내글 (이미지 또는 텍스트) 분석 AI 함수 ---
// 이제 하나의 함수로 이미지와 텍스트를 모두 처리할 수 있습니다.
exports.analyzeGroupBuy = functions.https.onCall(async (data, context) => {
  const { imageBase64, text: textToAnalyze } = data;

  if (!imageBase64 && !textToAnalyze) {
    throw new functions.https.HttpsError('invalid-argument', 'Missing image or text data.');
  }

  const prompt = `
    Analyze the provided image or text, which is a group buy announcement.
    Extract the following information and respond ONLY with a single valid JSON object.
    - "productName": The main name of the product.
    - "price": The final sale price as a number.
    - "expirationDate": The expiration date in "YYYY.MM.DD" format. If not present, use null.
    - "arrivalDate": The expected arrival date in "MM/DD" or "YYYY-MM-DD" format. If not present, use null.
    - "tags": Extract 3-5 relevant keywords or tags as an array of strings.
    - "description": A short, one-sentence summary of the product's features.
    If a field cannot be found, its value should be null.
  `;

  try {
    let result;
    if (imageBase64) {
      const imagePart = { inlineData: { data: imageBase64, mimeType: 'image/png' } };
      result = await model.generateContent([prompt, imagePart]);
    } else {
      result = await model.generateContent(prompt + "\n\n--- Analyze this text ---\n" + textToAnalyze);
    }
    
    const text = result.response.text();
    const jsonMatch = text.match(/\{[\s\S]*\}/); // JSON 객체 부분만 추출
    if (jsonMatch && jsonMatch[0]) {
      return JSON.parse(jsonMatch[0]);
    }
    throw new Error("Could not find a valid JSON object in the response.");
  } catch (error) {
    console.error("Gemini API Error (GroupBuy):", error);
    throw new functions.https.HttpsError("internal", error.message || "Failed to analyze group buy post.");
  }
});


// --- 2. 발주 전표 분석 AI 함수 ---
exports.analyzeOrderSlip = functions.https.onCall(async (data, context) => {
  const imageBase64 = data.imageBase64;
  if (!imageBase64) { throw new functions.https.HttpsError('invalid-argument', 'Missing image data.'); }

  const prompt = `
    Analyze the provided image, which is a product order slip or transaction statement.
    Extract all line items from the table.
    Respond ONLY with a valid JSON array of objects. Do not include any other text or markdown.
    Each object must have these keys: "productName" (string, from '품명' column), "quantity" (number, from '수량' column), "supplyPrice" (number, from '공급가' column), and "totalAmount" (number, from '금액' column).
    If no items are found, you MUST return an empty JSON array: [].
  `;

  const imagePart = { inlineData: { data: imageBase64, mimeType: 'image/png' } };
  
  try {
    const result = await model.generateContent([prompt, imagePart]);
    const text = result.response.text();
    const jsonMatch = text.match(/\[\s*\{[\s\S]*?\}\s*\]/); // JSON 배열 부분만 추출
    if (jsonMatch && jsonMatch[0]) {
      return JSON.parse(jsonMatch[0]);
    }
    return []; // 못 찾으면 빈 배열 반환
  } catch (error) {
    console.error("Gemini API Error (OrderSlip):", error);
    throw new functions.https.HttpsError("internal", error.message || "Failed to analyze order slip.");
  }
});