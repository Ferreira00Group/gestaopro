import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import JSZip from 'jszip';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const isProd = process.env.NODE_ENV === 'production';
const PORT = Number(process.env.PORT) || 3000;

const app = express();
app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ extended: true, limit: '15mb' }));

// Helper to generate system ZIP archive for downloads
async function generateSystemZip(): Promise<Buffer> {
  const zip = new JSZip();
  const rootDir = __dirname;
  const files = await fs.promises.readdir(rootDir, { withFileTypes: true });

  for (const entry of files) {
    if (entry.isDirectory()) {
      continue;
    }
    if (
      entry.name.startsWith('.') ||
      entry.name === 'server.ts' ||
      entry.name.endsWith('.log')
    ) {
      continue;
    }
    try {
      const filePath = path.join(rootDir, entry.name);
      const data = await fs.promises.readFile(filePath);
      zip.file(entry.name, data);
    } catch (e) {
      console.warn(`Could not add ${entry.name} to zip:`, e);
    }
  }

  return await zip.generateAsync({
    type: 'nodebuffer',
    compression: 'DEFLATE',
    compressionOptions: { level: 6 },
  });
}

// 1. Download endpoints
app.get('/download', async (_req, res) => {
  try {
    const zipBuffer = await generateSystemZip();
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader(
      'Content-Disposition',
      'attachment; filename="gestaopro-v5.88.2.zip"'
    );
    res.setHeader('Content-Length', zipBuffer.length);
    res.send(zipBuffer);
  } catch (err: any) {
    console.error('Error generating ZIP download:', err);
    res.status(500).send('Erro ao gerar download do sistema');
  }
});

app.get('/api/download/base64', async (_req, res) => {
  try {
    const zipBuffer = await generateSystemZip();
    res.json({
      success: true,
      filename: 'gestaopro-v5.88.2.zip',
      data: zipBuffer.toString('base64'),
    });
  } catch (err: any) {
    console.error('Error generating base64 download:', err);
    res.status(500).json({ error: 'Erro ao gerar dados do download' });
  }
});

// 2. Gemini AI Copilot API
app.post('/api/gemini/assistente', async (req, res) => {
  try {
    const { prompt, context, history } = req.body;
    if (!prompt) {
      return res.status(400).json({ error: 'Prompt é obrigatório' });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      // 503 allows the client frontend to gracefully fallback to its local analytical logic
      return res.status(503).json({
        error: 'GEMINI_API_KEY não configurada no servidor',
        fallback: true,
      });
    }

    const ai = new GoogleGenAI({ apiKey });
    const systemInstruction = `Você é o Copiloto IA de Elite do ERP GestãoPRO, especialista em finanças empresariais, fluxo de caixa, precificação, fábrica, controle de estoque e vendas.
Responda de forma direta, analítica e executiva em português do Brasil.
Utilize os números e indicadores reais fornecidos no contexto do ERP.
Formate a resposta com clareza, listas e recomendações práticas.`;

    const userContent = `Contexto Atual do ERP:
${JSON.stringify(context || {}, null, 2)}

Histórico recente:
${Array.isArray(history) ? history.map((h: any) => `${h.role}: ${h.text}`).join('\n') : ''}

Pergunta do usuário:
${prompt}`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: userContent,
      config: {
        systemInstruction,
        temperature: 0.3,
      },
    });

    const text = response.text || '';
    return res.json({ text });
  } catch (err: any) {
    console.error('Erro na chamada Gemini Assistente:', err);
    return res
      .status(503)
      .json({ fallback: true, error: err.message || 'Erro ao processar consulta de IA' });
  }
});

// 3. Gemini Autonomous Actions API
app.post('/api/gemini/acoes-autonomas', async (req, res) => {
  try {
    const { stateContext } = req.body;
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return res.status(503).json({
        error: 'GEMINI_API_KEY não configurada',
        acoes: [],
      });
    }

    const ai = new GoogleGenAI({ apiKey });
    const prompt = `Analise os dados deste ERP e retorne uma lista de ações autônomas prioritárias para melhorar o caixa, evitar ruptura de estoque e cobrar inadimplentes.
Contexto:
${JSON.stringify(stateContext || {}, null, 2)}

Responda SOMENTE em JSON com o formato:
{
  "acoes": [
    {
      "id": "acao-1",
      "tipo": "REPOR_ESTOQUE",
      "titulo": "Título sucinto",
      "motivo": "Motivo detalhado",
      "impactoFinanceiro": "Impacto estimado em R$",
      "urgencia": "alta",
      "autoExecutavel": true
    }
  ]
}`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
      },
    });

    const parsed = JSON.parse(response.text || '{"acoes":[]}');
    return res.json(parsed);
  } catch (err: any) {
    console.error('Erro ao gerar ações autônomas via Gemini:', err);
    return res.status(503).json({ acoes: [], fallback: true, error: err.message });
  }
});

// 4. Vite Dev Server / Static Hosting
async function startServer() {
  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        host: '0.0.0.0',
        port: PORT,
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    if (fs.existsSync(distPath)) {
      app.use(express.static(distPath));
    }
    app.use(express.static(__dirname));
    app.get('*', (_req, res) => {
      const indexPath = fs.existsSync(path.join(distPath, 'index.html'))
        ? path.join(distPath, 'index.html')
        : path.join(__dirname, 'index.html');
      res.sendFile(indexPath);
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[GestãoPRO] Servidor ativo em http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Erro fatal ao iniciar servidor:', err);
  process.exit(1);
});
