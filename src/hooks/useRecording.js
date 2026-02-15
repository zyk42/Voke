import { useState, useRef, useCallback, useEffect } from 'react';

/**
 * 录音功能Hook
 * 提供录音、停止录音、音频处理等功能
 */
export const useRecording = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [error, setError] = useState(null);
  const [audioData, setAudioData] = useState(null);

  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const streamRef = useRef(null);
  const selectedTextPromiseRef = useRef(null); // Promise for async selected text retrieval
  const selectedTextRef = useRef(''); // Added back selectedTextRef
  
  // 状态追踪 Refs，用于处理竞态条件
  const isStartingRef = useRef(false);
  const stopRequestedRef = useRef(false);
  const initStreamRef = useRef(null); // 持久化音频流引用
  const recordingModeRef = useRef('optimize'); // 录音模式引用：'optimize' (default) or 'ask'
  
  // 添加防重复处理机制
  const processingRef = useRef({ isProcessingAudio: false, lastProcessTime: 0 });

  // 清理函数：组件卸载时关闭音频流
  useEffect(() => {
    return () => {
      if (initStreamRef.current) {
        initStreamRef.current.getTracks().forEach(track => track.stop());
        initStreamRef.current = null;
      }
    };
  }, []);

  // 预热音频流
  const warmupStream = useCallback(async () => {
    if (initStreamRef.current && initStreamRef.current.active) return initStreamRef.current;
    
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: 16000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });
      initStreamRef.current = stream;
      return stream;
    } catch (err) {
      console.error('音频流预热失败:', err);
      return null;
    }
  }, []);

  // 自动预热音频流
  useEffect(() => {
    warmupStream();
  }, [warmupStream]);

  // 开始录音
  const startRecording = useCallback(async (mode = 'optimize') => {
    // 设置录音模式
    recordingModeRef.current = mode;
    console.log(`开始录音，模式: ${mode}`);

    // 如果正在启动中，直接返回，避免重复调用
    if (isStartingRef.current) return;
    
    try {
      isStartingRef.current = true;
      stopRequestedRef.current = false;
      setError(null);

      // 检查浏览器支持
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('您的浏览器不支持录音功能');
      }

      // 获取音频流（优先使用预热流）
      let stream = initStreamRef.current;
      if (!stream || !stream.active) {
        console.log('音频流未预热或已失效，重新获取...');
        stream = await warmupStream();
      }

      if (!stream) {
        throw new Error('无法获取麦克风权限');
      }

      // 确保流是活动的
      if (!stream.active) {
        console.log('缓存流已失效，尝试重新获取...');
        initStreamRef.current = null;
        stream = await warmupStream();
      }

      // 重置选中项引用
      selectedTextRef.current = '';
      selectedTextPromiseRef.current = null;

      streamRef.current = stream;
      audioChunksRef.current = [];

      // 创建MediaRecorder
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus'
      });

      mediaRecorderRef.current = mediaRecorder;

      // 设置事件处理器
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        setIsRecording(false);
        setIsProcessing(true);

        try {
          // 创建音频Blob
          const audioBlob = new Blob(audioChunksRef.current, {
            type: 'audio/webm;codecs=opus'
          });

          setAudioData(audioBlob);

          // 处理音频
          await processAudio(audioBlob);
        } catch (err) {
          setError(`音频处理失败: ${err.message}`);
        } finally {
          setIsProcessing(false);
        }
      };

      mediaRecorder.onerror = (event) => {
        setError(`录音错误: ${event.error?.message || '未知错误'}`);
        setIsRecording(false);
        setIsProcessing(false);
      };

      // 开始录音
      mediaRecorder.start(1000); // 每秒收集一次数据
      setIsRecording(true);
      
      // Sync state with Main process and Overlay
      if (window.electronAPI) {
        window.electronAPI.setRecordingState(true).catch(console.error);
        window.electronAPI.updateOverlayState({ mode: 'recording' }).catch(console.error);
      }

      // 录音成功启动后，重置启动标志
      isStartingRef.current = false;

      // 如果在启动过程中收到了停止请求，立即停止录音
      if (stopRequestedRef.current) {
        console.log('检测到启动期间的停止请求，立即停止录音');
        stopRecording();
      }

    } catch (err) {
      isStartingRef.current = false; // 发生错误也要重置
      setError(`无法开始录音: ${err.message}`);
      setIsRecording(false);
    }
  }, []); // Removed modelStatus dependencies

  // 停止录音
  const stopRecording = useCallback(async () => {
    // 1. 如果正在启动中，标记为需要停止
    if (isStartingRef.current) {
      console.log('录音正在启动中，标记为需要立即停止');
      stopRequestedRef.current = true;
      return;
    }

    if (mediaRecorderRef.current && isRecording) {
      // 2. 立即触发选中文本获取 (并行执行)
      // 在停止录音的瞬间就开始获取文本，而不是等到音频处理时
      if (window.electronAPI && window.electronAPI.getSelectedText) {
        selectedTextPromiseRef.current = window.electronAPI.getSelectedText()
          .then(text => {
            if (text && window.electronAPI.log) {
              window.electronAPI.log('info', '已捕获选中项文本 (停止录音时触发)', { length: text.length });
            }
            return text;
          })
          .catch(err => {
            console.warn('Failed to get selected text asynchronously:', err);
            return '';
          });
      }

      // 2. 停止录音 (这将触发 onstop -> processAudio)
      mediaRecorderRef.current.stop();

      // Sync state with Main process and Overlay
      if (window.electronAPI) {
        window.electronAPI.setRecordingState(false).catch(console.error);
        window.electronAPI.updateOverlayState({ mode: 'processing' }).catch(console.error);
      }

      // 注意：不再停止音频轨道，以便下次快速启动
      // 只在组件卸载时清理 initStreamRef
      if (streamRef.current !== initStreamRef.current) {
         // 如果当前使用的流不是缓存的流（极少情况），则停止它
         // 但为了保险，我们尽量只使用 initStreamRef
         // 这里什么都不做，保持流开启
      }
    }
  }, [isRecording]);

  // 处理音频
  const processAudio = useCallback(async (audioBlob) => {
    processingRef.current.isProcessingAudio = true;
    
    try {
      // 1. 音频转换任务
      const wavBlobPromise = convertToWav(audioBlob);
      
      // 2. 获取选中文本任务 (优先使用 stopRecording 中已启动的任务)
      let textPromise = selectedTextPromiseRef.current;
      
      // 如果没有预先启动的任务 (异常情况)，则现在启动
      if (!textPromise) {
        if (window.electronAPI && window.electronAPI.getSelectedText) {
          textPromise = window.electronAPI.getSelectedText()
            .then(text => {
              if (text) {
                 if (window.electronAPI.log) {
                   window.electronAPI.log('info', '已捕获选中项文本 (补救获取)', { length: text.length });
                 }
              }
              return text;
            })
            .catch(err => {
              console.warn('Failed to get selected text asynchronously:', err);
              return '';
            });
        } else {
          textPromise = Promise.resolve('');
        }
      }

      // 3. 等待两者都完成 (并行等待)
      const [wavResult, selectedTextResult] = await Promise.all([wavBlobPromise, textPromise]);
      const { wavBlob, duration } = wavResult;
      
      // 更新 selectedTextRef 以防万一
      if (selectedTextResult) {
        selectedTextRef.current = selectedTextResult;
      }

      if (window.electronAPI) {
        const arrayBuffer = await wavBlob.arrayBuffer();
        const uint8Array = new Uint8Array(arrayBuffer);

        const transcriptionResult = await window.electronAPI.transcribeAudio(uint8Array);

        if (transcriptionResult.success) {
          const raw_text = transcriptionResult.text;
          
          // 准备转录数据
          const transcriptionData = {
            raw_text: raw_text,
            text: raw_text, // 初始文本设为原始文本
            confidence: transcriptionResult.confidence || 0,
            language: transcriptionResult.language || 'zh-CN',
            duration: duration || 0, // 使用前端计算的精确时长
            file_size: uint8Array.length,
            type: 'normal' // 默认类型
          };

          // 立即显示初步结果
          if (window.onTranscriptionComplete) {
            window.onTranscriptionComplete({ ...transcriptionResult, enhanced_by_ai: false });
          }

          // 异步处理AI优化和保存（只保存一次）
          setIsOptimizing(true);
          setTimeout(async () => {
            try {
              // 从设置中读取是否启用AI优化
              const useAI = await window.electronAPI.getSetting('enable_ai_optimization', true);

              let finalData = { ...transcriptionData };

              // Determine logic type based on useAI, recording mode and selected text
              if (!useAI) {
                finalData.type = 'normal';
              } else {
                // Determine mode based on user intent and selected text
                if (recordingModeRef.current === 'ask') {
                  finalData.type = 'ask';
                } else {
                  // In optimize/default mode, check if there is selected text
                  // If selected text exists -> command mode
                  // If no selected text -> optimize mode (default AI action)
                  const selectedText = selectedTextRef.current;
                  finalData.type = (selectedText && selectedText.trim().length > 0) ? 'command' : 'optimize';
                }
              }

              if (useAI) {
                try {
                  if (window.electronAPI && window.electronAPI.log) {
                    window.electronAPI.log('info', '开始AI文本优化:', raw_text.substring(0, 50) + '...');
                  }
                  
                  // Use selected text if available (command mode)
                  const selectedText = selectedTextRef.current;
                  let mode = finalData.type; // Use the determined type as mode
                  
                  if (window.electronAPI && window.electronAPI.log) {
                    window.electronAPI.log('info', `Processing text with AI (Mode: ${mode})`, { 
                      textLength: raw_text.length,
                      selectedTextLength: selectedText ? selectedText.length : 0,
                      userIntent: recordingModeRef.current
                    });
                  }

                  const result = await window.electronAPI.processText(raw_text, mode, selectedText);

                  if (result && result.success) {
                    const processed_text = result.text;
                    finalData.processed_text = processed_text;
                    // 如果AI优化后的文本与原始文本不同，则将优化后的文本作为主文本
                    if (processed_text && processed_text.trim() !== raw_text.trim()) {
                      finalData.text = processed_text;
                    }
                    if (window.electronAPI && window.electronAPI.log) {
                      window.electronAPI.log('info', 'AI文本优化成功', processed_text.substring(0, 50) + '...');
                    }
                  } else {
                    if (window.electronAPI && window.electronAPI.log) {
                      window.electronAPI.log('error', 'AI文本优化失败:', result);
                    }
                  }
                } catch (err) {
                  if (window.electronAPI && window.electronAPI.log) {
                    window.electronAPI.log('error', 'AI文本优化捕获到错误:', err);
                  }
                }
              }

              // 优先通知UI更新并触发复制操作 (Before saving to DB)
              if (window.electronAPI) {
                // 只要有AI处理结果（哪怕内容没变），都视为AI优化成功
                if (useAI && finalData.processed_text !== undefined && finalData.processed_text !== null) {
                  // 有AI优化结果时
                  const enhancedResult = {
                    ...transcriptionResult,
                    text: finalData.processed_text,
                    processed_text: finalData.processed_text,
                    enhanced_by_ai: true,
                  };
                  if (window.onAIOptimizationComplete) {
                    window.onAIOptimizationComplete(enhancedResult);
                  }
                } else {
                  // 没有AI优化或AI优化失败时，使用原始文本
                  const finalResult = {
                    ...transcriptionResult,
                    text: raw_text,
                    enhanced_by_ai: false,
                  };
                  if (window.onAIOptimizationComplete) {
                    window.onAIOptimizationComplete(finalResult);
                  }
                }

                // 异步保存转录数据，不等待，也不阻塞UI
                window.electronAPI.saveTranscription(finalData).catch(err => {
                   console.error('保存转录数据失败:', err);
                });
              }
            } catch (err) {
              if (window.electronAPI && window.electronAPI.log) {
                window.electronAPI.log('error', '处理和保存转录时出错:', err);
              }
            } finally {
              setIsOptimizing(false);
            }
          }, 100);

          return { ...transcriptionResult, enhanced_by_ai: false };
        } else {
          throw new Error(transcriptionResult.error || '语音识别失败');
        }
      } else {
        // Web环境模拟
        const mockResult = { success: true, text: '模拟识别结果。', confidence: 0.95, duration: 3.5 };
        if (window.onTranscriptionComplete) window.onTranscriptionComplete(mockResult);
        return mockResult;
      }
    } catch (err) {
      throw new Error(`音频处理失败: ${err.message}`);
    } finally {
      processingRef.current.isProcessingAudio = false;
      if (window.electronAPI) {
        window.electronAPI.updateOverlayState({ mode: 'idle' }).catch(console.error);
      }
    }
  }, []);

  // 转换音频格式为WAV
  const convertToWav = useCallback(async (audioBlob) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = async () => {
        try {
          const arrayBuffer = reader.result;

          // 创建AudioContext
          // 使用 try-catch 包裹 AudioContext 创建，防止浏览器限制
          let audioContext;
          try {
             audioContext = new (window.AudioContext || window.webkitAudioContext)({
              sampleRate: 16000
            });
          } catch (e) {
            reject(new Error(`无法创建 AudioContext: ${e.message}`));
            return;
          }

          // 检查数据是否有效
          if (!arrayBuffer || arrayBuffer.byteLength === 0) {
             reject(new Error("音频数据为空"));
             audioContext.close();
             return;
          }

          // 解码音频数据
          try {
            const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
            const duration = audioBuffer.duration; // 获取精确时长
            
            // 转换为WAV格式
            const wavBuffer = audioBufferToWav(audioBuffer);
            const wavBlob = new Blob([wavBuffer], { type: 'audio/wav' });

            // 关闭AudioContext释放资源
            audioContext.close();

            resolve({ wavBlob, duration });
          } catch (decodeErr) {
             // 详细的解码错误日志
             console.error("Audio decode error:", decodeErr);
             audioContext.close();
             reject(new Error(`音频解码失败: ${decodeErr.message}。可能是录音时间太短或格式不支持。`));
          }
        } catch (err) {
          reject(new Error(`音频格式转换失败: ${err.message}`));
        }
      };

      reader.onerror = () => {
        reject(new Error('读取音频文件失败'));
      };

      reader.readAsArrayBuffer(audioBlob);
    });
  }, []);

  // AudioBuffer转WAV格式
  const audioBufferToWav = (audioBuffer) => {
    const length = audioBuffer.length;
    const sampleRate = audioBuffer.sampleRate;
    const numberOfChannels = audioBuffer.numberOfChannels;
    const bytesPerSample = 2;
    const blockAlign = numberOfChannels * bytesPerSample;
    const byteRate = sampleRate * blockAlign;
    const dataSize = length * blockAlign;
    const bufferSize = 44 + dataSize;

    const buffer = new ArrayBuffer(bufferSize);
    const view = new DataView(buffer);

    // WAV文件头
    const writeString = (offset, string) => {
      for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i));
      }
    };

    writeString(0, 'RIFF');
    view.setUint32(4, bufferSize - 8, true);
    writeString(8, 'WAVE');
    writeString(12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, numberOfChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, byteRate, true);
    view.setUint16(32, blockAlign, true);
    view.setUint16(34, bytesPerSample * 8, true);
    writeString(36, 'data');
    view.setUint32(40, dataSize, true);

    // 音频数据
    let offset = 44;
    for (let i = 0; i < length; i++) {
      for (let channel = 0; channel < numberOfChannels; channel++) {
        const sample = Math.max(-1, Math.min(1, audioBuffer.getChannelData(channel)[i]));
        view.setInt16(offset, sample * 0x7FFF, true);
        offset += 2;
      }
    }

    return buffer;
  };

  // 取消录音
  const cancelRecording = useCallback(() => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }

    setIsRecording(false);
    setIsProcessing(false);
    setError(null);
    audioChunksRef.current = [];
  }, []);

  // 获取录音权限状态
  const checkPermissions = useCallback(async () => {
    try {
      const result = await navigator.permissions.query({ name: 'microphone' });
      return result.state; // 'granted', 'denied', 'prompt'
    } catch (err) {
      if (window.electronAPI && window.electronAPI.log) {
        window.electronAPI.log('warn', '无法检查麦克风权限:', err);
      }
      return 'unknown';
    }
  }, []);


  return {
    isRecording,
    isProcessing,
    isOptimizing,
    error,
    audioData,
    startRecording,
    stopRecording,
    cancelRecording,
    checkPermissions
  };
};