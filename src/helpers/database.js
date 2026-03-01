const Database = require("better-sqlite3");
const path = require("path");
const fs = require("fs");

class DatabaseManager {
  constructor(logger = null) {
    this.db = null;
    this.dbPath = null;
    this.logger = logger;
  }

  initialize(dataDirectory) {
    this.dbPath = path.join(dataDirectory, "transcriptions.db");
    
    // 确保数据目录存在
    const dir = path.dirname(this.dbPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    this.db = new Database(this.dbPath);
    this.createTables();
  }

  createTables() {
    // 创建转录记录表
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS transcriptions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        text TEXT NOT NULL,
        raw_text TEXT,
        processed_text TEXT,
        confidence REAL,
        language TEXT DEFAULT 'zh-CN',
        duration REAL,
        file_size INTEGER,
        type TEXT DEFAULT 'normal',
        word_count INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 检查是否需要添加 type 列（针对现有数据库）
    try {
      const tableInfo = this.db.prepare("PRAGMA table_info(transcriptions)").all();
      
      const hasTypeColumn = tableInfo.some(col => col.name === 'type');
      if (!hasTypeColumn) {
        this.db.exec("ALTER TABLE transcriptions ADD COLUMN type TEXT DEFAULT 'normal'");
        if (this.logger) {
          this.logger.info("Database migration: Added 'type' column to transcriptions table");
        }
      }

      const hasWordCountColumn = tableInfo.some(col => col.name === 'word_count');
      if (!hasWordCountColumn) {
        this.db.exec("ALTER TABLE transcriptions ADD COLUMN word_count INTEGER DEFAULT 0");
        if (this.logger) {
          this.logger.info("Database migration: Added 'word_count' column to transcriptions table");
        }
      }
    } catch (err) {
      if (this.logger) {
        this.logger.error("Database migration error:", err);
      }
    }

    // 创建设置表
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 创建热词表
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS hotwords (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        word TEXT NOT NULL UNIQUE,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 创建索引
    this.db.exec(`
      CREATE INDEX IF NOT EXISTS idx_transcriptions_created_at 
      ON transcriptions(created_at DESC)
    `);
  }

  saveTranscription(data) {
    // 验证必需的数据
    if (!data || typeof data !== 'object') {
      throw new Error('转录数据无效');
    }

    // 确保text字段存在且不为空
    const text = data.text || data.raw_text || '';
    if (!text || text.trim().length === 0) {
      throw new Error('转录文本不能为空');
    }

    // 自动检测语言
    let detectedLanguage = 'zh-CN'; // 默认为中文
    const hasChinese = /[\u4e00-\u9fa5]/.test(text);
    const hasEnglish = /[a-zA-Z]/.test(text);

    if (!hasChinese && hasEnglish) {
      detectedLanguage = 'en-US'; // 纯英文
    } else if (hasChinese && hasEnglish) {
      detectedLanguage = 'zh-en'; // 中英混合
    } else {
      detectedLanguage = 'zh-CN'; // 纯中文或其他
    }

    // 计算字数
    // 中文按字符数计算，英文按单词数计算
    // 简单实现：将中文字符和英文单词（以空格分隔）统一计数
    // 这里采用更简单的策略：直接计算 text.length，或者按用户习惯计算
    // 按照用户需求：根据text判断字数
    const wordCount = text.trim().length;

    const stmt = this.db.prepare(`
      INSERT INTO transcriptions (
        text, raw_text, processed_text, confidence,
        language, duration, file_size, type, word_count
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    return stmt.run(
      text.trim(),
      data.raw_text || null,
      data.processed_text || null,
      data.confidence || 0,
      detectedLanguage,
      data.duration || 0,
      data.file_size || 0,
      data.type || 'normal',
      wordCount
    );
  }

  getTranscriptions(limit = 50, offset = 0) {
    const stmt = this.db.prepare(`
      SELECT * FROM transcriptions 
      ORDER BY created_at DESC 
      LIMIT ? OFFSET ?
    `);
    return stmt.all(limit, offset);
  }

  getAllTranscriptions() {
    const stmt = this.db.prepare(`
      SELECT * FROM transcriptions 
      ORDER BY created_at DESC 
    `);
    return stmt.all();
  }

  getTranscriptionById(id) {
    const stmt = this.db.prepare("SELECT * FROM transcriptions WHERE id = ?");
    return stmt.get(id);
  }

  deleteTranscription(id) {
    const stmt = this.db.prepare("DELETE FROM transcriptions WHERE id = ?");
    return stmt.run(id);
  }

  clearAllTranscriptions() {
    const stmt = this.db.prepare("DELETE FROM transcriptions");
    return stmt.run();
  }

  searchTranscriptions(query, limit = 50) {
    const stmt = this.db.prepare(`
      SELECT * FROM transcriptions 
      WHERE text LIKE ? OR raw_text LIKE ? OR processed_text LIKE ?
      ORDER BY created_at DESC 
      LIMIT ?
    `);
    const searchTerm = `%${query}%`;
    return stmt.all(searchTerm, searchTerm, searchTerm, limit);
  }

  getTranscriptionStats() {
    const totalStmt = this.db.prepare("SELECT COUNT(*) as total FROM transcriptions");
    const todayStmt = this.db.prepare(`
      SELECT COUNT(*) as today FROM transcriptions 
      WHERE date(created_at) = date('now')
    `);
    const weekStmt = this.db.prepare(`
      SELECT COUNT(*) as week FROM transcriptions 
      WHERE created_at >= date('now', '-7 days')
    `);

    // 基础数据
    const basicStatsStmt = this.db.prepare(`
      SELECT 
        COUNT(*) as total_count,
        SUM(duration) as total_duration,
        SUM(word_count) as total_word_count,
        COUNT(DISTINCT date(created_at)) as total_days
      FROM transcriptions
    `);

    // 按类型统计
    const typeStatsStmt = this.db.prepare(`
      SELECT 
        type,
        COUNT(*) as count,
        SUM(duration) as duration,
        SUM(word_count) as word_count
      FROM transcriptions
      GROUP BY type
    `);

    // 按语言统计
    const langStatsStmt = this.db.prepare(`
      SELECT 
        language,
        COUNT(*) as count
      FROM transcriptions
      GROUP BY language
    `);

    const basicStats = basicStatsStmt.get();
    const typeStats = typeStatsStmt.all();
    const langStats = langStatsStmt.all();

    // 整理数据格式
    const stats = {
      // 兼容旧接口
      total: totalStmt.get().total,
      today: todayStmt.get().today,
      week: weekStmt.get().week,
      
      // 新增详细统计
      basic: {
        total_count: basicStats.total_count || 0,
        total_duration: basicStats.total_duration || 0,
        total_word_count: basicStats.total_word_count || 0,
        total_days: basicStats.total_days || 0
      },
      types: {
        optimize: { count: 0, duration: 0, word_count: 0 },
        command: { count: 0, duration: 0, word_count: 0 },
        ask: { count: 0, duration: 0, word_count: 0 },
        normal: { count: 0, duration: 0, word_count: 0 }
      },
      languages: {
        chinese: 0,
        english: 0,
        mixed: 0
      }
    };

    // 填充类型数据
    typeStats.forEach(item => {
      if (stats.types[item.type]) {
        stats.types[item.type] = {
          count: item.count || 0,
          duration: item.duration || 0,
          word_count: item.word_count || 0
        };
      }
    });

    // 填充语言数据
    langStats.forEach(item => {
      if (item.language === 'zh-CN') stats.languages.chinese = item.count;
      else if (item.language === 'en-US') stats.languages.english = item.count;
      else if (item.language === 'zh-en') stats.languages.mixed = item.count;
    });

    return stats;
  }

  setSetting(key, value) {
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO settings (key, value, updated_at) 
      VALUES (?, ?, CURRENT_TIMESTAMP)
    `);
    return stmt.run(key, JSON.stringify(value));
  }

  getSetting(key, defaultValue = null) {
    const stmt = this.db.prepare("SELECT value FROM settings WHERE key = ?");
    const result = stmt.get(key);
    
    if (result) {
      try {
        return JSON.parse(result.value);
      } catch (error) {
        return result.value;
      }
    }
    
    return defaultValue;
  }

  getAllSettings() {
    const stmt = this.db.prepare("SELECT key, value FROM settings");
    const rows = stmt.all();
    
    const settings = {};
    for (const row of rows) {
      try {
        settings[row.key] = JSON.parse(row.value);
      } catch (error) {
        settings[row.key] = row.value;
      }
    }
    
    return settings;
  }

  // 热词相关方法
  addHotword(word) {
    if (!word || !word.trim()) {
      throw new Error('热词不能为空');
    }
    try {
      const stmt = this.db.prepare("INSERT INTO hotwords (word) VALUES (?)");
      return stmt.run(word.trim());
    } catch (error) {
      if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
        throw new Error('该热词已存在');
      }
      throw error;
    }
  }

  deleteHotword(id) {
    const stmt = this.db.prepare("DELETE FROM hotwords WHERE id = ?");
    return stmt.run(id);
  }

  getHotwords() {
    const stmt = this.db.prepare("SELECT * FROM hotwords ORDER BY created_at DESC");
    return stmt.all();
  }

  resetSettings() {
    const stmt = this.db.prepare("DELETE FROM settings");
    return stmt.run();
  }

  backup(backupPath) {
    if (!this.db) return false;
    
    try {
      this.db.backup(backupPath);
      return true;
    } catch (error) {
      if (this.logger && this.logger.error) {
        this.logger.error("数据库备份失败:", error);
      }
      return false;
    }
  }

  close() {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
  }
}

module.exports = DatabaseManager;
