const fs = require('fs');
const path = require('path');

class Redactor {
    /**
     * 初始化脱敏器
     * @param {string} configPath - 配置文件路径（可选）
     */
    constructor(configPath) {
        this.config = this.loadConfig(configPath);
        this.compiledRules = this.compileRules();
    }

    /**
     * 加载配置文件
     * @param {string} configPath - 配置文件路径
     * @returns {object} 配置对象
     */
    loadConfig(configPath) {
        const defaultPath = path.join(__dirname, '../config/redact-rules.json');
        const loadPath = configPath || defaultPath;
        
        if (fs.existsSync(loadPath)) {
            try {
                return JSON.parse(fs.readFileSync(loadPath, 'utf8'));
            } catch (error) {
                console.warn(`⚠️  读取脱敏规则配置失败：${error.message}`);
                console.warn('   将使用默认配置（不脱敏）');
            }
        }
        
        // 返回默认配置
        return { enabled: false, rules: [], customReplacements: {} };
    }

    /**
     * 编译正则规则
     * @returns {array} 编译后的规则数组
     */
    compileRules() {
        if (!this.config.rules || !Array.isArray(this.config.rules)) {
            return [];
        }

        return this.config.rules.map(rule => {
            try {
                return {
                    ...rule,
                    regex: new RegExp(rule.pattern, 'gi')
                };
            } catch (error) {
                console.warn(`⚠️  规则 "${rule.name}" 的正则表达式无效：${error.message}`);
                return null;
            }
        }).filter(rule => rule !== null);
    }

    /**
     * 脱敏文本
     * @param {string} text - 原始文本
     * @returns {string} 脱敏后的文本
     */
    redact(text) {
        if (!this.config.enabled || !text || typeof text !== 'string') {
            return text;
        }

        let result = text;

        // 应用自定义替换
        if (this.config.customReplacements) {
            for (const [original, replacement] of Object.entries(this.config.customReplacements)) {
                if (original.startsWith('_')) continue; // 跳过注释字段
                const regex = new RegExp(this.escapeRegex(original), 'gi');
                result = result.replace(regex, replacement);
            }
        }

        // 应用规则替换
        for (const rule of this.compiledRules) {
            // 如果有上下文要求，检查上下文
            if (rule.context) {
                const contextRegex = new RegExp(rule.context, 'i');
                if (!contextRegex.test(result)) {
                    continue;
                }
            }
            result = result.replace(rule.regex, rule.replacement);
        }

        return result;
    }

    /**
     * 递归脱敏 JSON 对象
     * @param {any} obj - 原始对象
     * @returns {any} 脱敏后的对象
     */
    redactObject(obj) {
        if (typeof obj === 'string') {
            return this.redact(obj);
        }
        
        if (Array.isArray(obj)) {
            return obj.map(item => this.redactObject(item));
        }
        
        if (obj !== null && typeof obj === 'object') {
            const redacted = {};
            for (const [key, value] of Object.entries(obj)) {
                redacted[key] = this.redactObject(value);
            }
            return redacted;
        }
        
        return obj;
    }

    /**
     * 转义正则表达式特殊字符
     * @param {string} string - 原始字符串
     * @returns {string} 转义后的字符串
     */
    escapeRegex(string) {
        return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }

    /**
     * 获取脱敏统计信息
     * @param {string} original - 原始文本
     * @param {string} redacted - 脱敏后的文本
     * @returns {object} 统计信息
     */
    getStats(original, redacted) {
        const stats = {
            originalLength: original.length,
            redactedLength: redacted.length,
            replacements: []
        };

        // 统计每种规则替换的次数
        if (this.config.rules) {
            for (const rule of this.compiledRules) {
                const matches = original.match(rule.regex);
                if (matches) {
                    stats.replacements.push({
                        rule: rule.name,
                        count: matches.length
                    });
                }
            }
        }

        return stats;
    }
}

module.exports = Redactor;
