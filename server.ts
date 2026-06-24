import express from "express";
import path from "path";
import dotenv from "dotenv";
import { GoogleGenAI, Type } from "@google/genai";
import { createServer as createViteServer } from "vite";

dotenv.config();

const app = express();
const PORT = 3000;

// Set high limit for base64 image uploads
app.use(express.json({ limit: "20mb" }));

// Lazy initializer for Google Gen AI client
let aiClient: GoogleGenAI | null = null;

function getGeminiClient(): GoogleGenAI | null {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey === "MY_GEMINI_API_KEY") {
      console.warn("GEMINI_API_KEY is not configured or uses placeholder. Falling back to educational safety simulator.");
      return null;
    }
    aiClient = new GoogleGenAI({
      apiKey: apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return aiClient;
}

// AI Safety Check API endpoint
app.post("/api/safety-check", async (req, res) => {
  const { image, task, userName } = req.body;

  if (!image) {
    return res.status(400).json({ error: "이미지 데이터가 필요합니다." });
  }

  // Task descriptions
  const taskDetails: Record<string, { name: string; guideline: string }> = {
    escalator_line: {
      name: "에스컬레이터 노란선 안쪽에 서기",
      guideline: "두 발이 나란히 모여 있고, 노란선(발밑 경계선)을 밟거나 넘지 않고 안쪽에 바르게 서 있는가? 몸이 한쪽으로 크게 쏠리지 않고 안정적인가?"
    },
    escalator_handrail: {
      name: "에스컬레이터 손잡이 잡기",
      guideline: "한쪽 손이 손잡이 높이(가슴/허리 부근)로 올라와 가상의 손잡이를 꽉 잡고 있는 폼을 취하고 있는가? 서 있는 자세가 곧고 바른가?"
    },
    elevator_door: {
      name: "엘레베이터 문에서 떨어져 있기",
      guideline: "문에 기대거나 손을 대지 않고 문틈에서 안전한 거리(약 30cm 이상)만큼 떨어져 바르게 서 있는가? 손이나 몸을 문 쪽으로 뻗지 않았는가?"
    },
    elevator_bell: {
      name: "엘레베이터 비상벨 누르기 연습",
      guideline: "엘리베이터가 멈췄을 때 당황하지 않고 가상의 비상벨 버튼(벽면 높이)을 손가락이나 손바닥으로 침착하게 가리키며 누르는 동작을 취하고 있는가?"
    }
  };

  const selectedTask = taskDetails[task] || {
    name: "일반 안전 자세",
    guideline: "안전하게 바른 자세로 서 있는가?"
  };

  const client = getGeminiClient();

  if (!client) {
    // Elegant simulation fallback when no API key is set
    console.log("Simulating safety check response (No Gemini API Key)...");
    
    // Simulate randomized yet realistic feedback
    const passed = Math.random() > 0.15; // 85% pass rate
    const score = passed ? Math.floor(Math.random() * 21) + 80 : Math.floor(Math.random() * 20) + 40;
    
    let feedback = "";
    if (task === "escalator_line") {
      feedback = passed 
        ? `훌륭해요, ${userName || "어린이"}님! 노란선 안쪽에 두 발을 아주 가지런히 잘 모으고 서 계시네요. 노란선을 밟으면 에스컬레이터 틈새에 옷이나 신발이 낄 수 있으니 항상 지금처럼 서야 해요.`
        : `아쉽게도 발이 노란선 경계 부근에 걸쳐져 있거나 자세가 흐트러졌어요. 에스컬레이터의 틈새는 아주 튼튼해서 신발이나 바지가 끼어 들어갈 수 있답니다. 항상 노란선 안쪽 안전구역 한가운데에 발을 디뎌주세요!`;
    } else if (task === "escalator_handrail") {
      feedback = passed
        ? `아주 든든합니다! 가상의 손잡이를 손으로 꽉 붙잡고 중심을 아주 잘 잡고 계시네요. 에스컬레이터가 갑자기 덜컹거리거나 멈출 때 손잡이를 안 잡고 있으면 넘어지기 쉬워요. 완벽한 자세입니다!`
        : `어라? 한 손으로 안전 손잡이를 잡는 포즈가 잘 보이지 않아요. 에스컬레이터가 움직일 때는 흔들림이 있을 수 있으니 가상 혹은 실제 손잡이를 꼭 잡는 습관을 들여보세요!`;
    } else if (task === "elevator_door") {
      feedback = passed
        ? `백점 만점 자세입니다! 엘리베이터 문이나 문틈에서 안전하게 떨어져 뒤쪽을 지긋이 바라보고 계시네요. 문이 열리고 닫힐 때 옷자락이나 가방 끈이 끼이지 않도록 항상 이 간격을 유지해 주세요.`
        : `문 쪽으로 너무 가깝게 서 있거나 문을 향해 기울어지는 자세는 위험해요! 엘리베이터 문이 열릴 때 문틈으로 손이나 옷이 빨려 들어갈 수 있답니다. 문에서 뒤쪽으로 두 걸음 물러나 서 주시겠어요?`;
    } else {
      feedback = passed
        ? `위기 대처 완료! 엘리베이터 비상 버튼을 아주 정확하고 침착하게 손으로 누르는 포즈를 완벽히 취하셨어요. 갇혔을 때 억지로 문을 열지 않고, 비상벨을 눌러 구조 요청을 보내는 방법을 완벽히 배웠군요!`
        : `비상벨 위치에 손을 올려 누르는 연출이 조금 어정쩡해요. 벽면에 있는 빨간 비상벨 위치를 찾아 손가락으로 꾸욱 세게 대고 도움을 요청하는 정교한 동작을 시도해 볼까요?`;
    }

    // Delay to simulate network
    await new Promise((resolve) => setTimeout(resolve, 1500));
    return res.json({
      passed,
      score,
      feedback,
      simulated: true
    });
  }

  try {
    // Strip metadata prefix if exists (e.g. "data:image/jpeg;base64,")
    const cleanBase64 = image.includes("base64,") ? image.split("base64,")[1] : image;

    const systemInstruction = `
      너는 어린이 에스컬레이터 및 엘리베이터 안전 교육 센터의 'AI 안전 수호 지킴이' 전문가이다.
      사용자가 안전 수칙 자세를 취하고 찍은 웹캠 사진을 실시간으로 분석하여 평가를 제공해야 한다.
      사용자 이름: ${userName || "어린이"}
      체험 항목: ${selectedTask.name}
      수칙 세부 가이드라인: ${selectedTask.guideline}

      [미션]
      제공된 인물 사진을 보고, 체험 항목과 수칙 가이드라인에 잘 도달했는지 냉정하고 꼼꼼하게 판단하라.
      어린이 대상 교육이므로 친절하고 격려하는 말투(해요체)를 쓰되, 점수와 패스 여부는 사진에 담긴 자세를 보고 과학적이고 엄밀하게 평가해야 한다.
      사용자의 신체부위(발의 위치, 손의 동작 등)를 보고, 바르게 행하고 있다면 'passed': true를, 노란선을 밟고 있거나 손잡이를 잡지 않거나 문에 기대고 있거나 비상벨을 안 누르고 있다면 'passed': false를 할당하라.
      'score'는 0점에서 100점 사이로 지정하라. (passed가 true일 경우 80~100점, false일 경우 30~79점)
      'feedback'에는 자세에 대한 정확한 분석과(예: "두 발이 노란선 안쪽에 잘 안착해 있어요", "손이 손잡이 높이보다 낮아 보여요"), 왜 그렇게 행동해야 안전한지 이유를 포함해 한국어로 3~4문장의 교육적인 격려 피드백을 작성해라.
    `;

    const response = await client.models.generateContent({
      model: "gemini-3.5-flash",
      contents: [
        {
          inlineData: {
            mimeType: "image/jpeg",
            data: cleanBase64
          }
        },
        {
          text: `Evaluate the user's safety posture. Task: ${task}. User Name: ${userName || "어린이"}`
        }
      ],
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            passed: {
              type: Type.BOOLEAN,
              description: "Whether the safety posture perfectly conforms to the safety guidelines."
            },
            score: {
              type: Type.INTEGER,
              description: "Safety rating score from 0 to 100."
            },
            feedback: {
              type: Type.STRING,
              description: "Detailed safety education guidance feedback in Korean. Address the user directly."
            }
          },
          required: ["passed", "score", "feedback"]
        }
      }
    });

    const resultText = response.text;
    if (!resultText) {
      throw new Error("No text response from Gemini API.");
    }

    const result = JSON.parse(resultText.trim());
    return res.json({
      passed: result.passed,
      score: result.score,
      feedback: result.feedback,
      simulated: false
    });

  } catch (error: any) {
    console.error("Gemini Safety Check Error:", error);
    return res.status(500).json({
      error: "AI 진단 중 오류가 발생했습니다.",
      details: error.message
    });
  }
});

// Setup Vite Dev server middleware or serve production static assets
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
