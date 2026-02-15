const path = require("path");
const fs = require("fs");
const OpenAI = require("openai");

class AliyunASRManager {
  constructor(logger = null) {
    this.logger = logger || console;
    this.logger.info("AliyunASRManager initialized (Node.js/OpenAI SDK Mode)");
  }

  async transcribe(audioPath, options = {}) {
    return new Promise(async (resolve, reject) => {
      try {
        if (!fs.existsSync(audioPath)) {
          return reject(new Error("Audio file not found"));
        }

        const apiKey = options.apiKey || process.env.DASHSCOPE_API_KEY;
        if (!apiKey) {
          return reject(new Error("Missing ASR API Key. Please configure it in settings."));
        }
        
        const baseURL = options.baseUrl || "https://dashscope.aliyuncs.com/compatible-mode/v1";
        const model = options.model || "qwen3-asr-flash";

        this.logger.info("Starting Aliyun transcription...", { audioPath, model, baseURL });

        // Initialize OpenAI client compatible with Aliyun
        const client = new OpenAI({
          apiKey: apiKey,
          baseURL: baseURL,
        });

        // Read and encode audio file
        const audioFile = fs.readFileSync(audioPath);
        const base64Audio = audioFile.toString('base64');
        // Detect file type or default to wav since we convert to wav in frontend
        const ext = path.extname(audioPath).toLowerCase().replace('.', '');
        const mimeType = ext === 'mp3' ? 'audio/mpeg' : 'audio/wav';
        const dataUri = `data:${mimeType};base64,${base64Audio}`;

        // Call API
        const completion = await client.chat.completions.create({
          model: model,
          messages: [
            {
              role: "user",
              content: [
                {
                  type: "input_audio",
                  input_audio: {
                    data: dataUri
                  }
                }
              ]
            }
          ],
          stream: false,
          extra_body: {
            asr_options: {
              enable_itn: false
            }
          }
        });

        // Process response
        if (completion.choices && completion.choices.length > 0) {
          const message = completion.choices[0].message;
          if (message.content) {
             this.logger.info("Transcription success", { textLength: message.content.length });
             resolve(message.content); // Return string directly to match previous behavior
          } else {
             reject(new Error("Empty content in response"));
          }
        } else {
          reject(new Error("Invalid response format from API"));
        }

      } catch (error) {
        this.logger.error("Transcription error:", error);
        resolve({ error: `Exception: ${error.message}` });
      }
    });
  }
}

module.exports = AliyunASRManager;
