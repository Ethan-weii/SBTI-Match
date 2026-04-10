/**
 * SBTI 评分引擎 — 纯函数，无 DOM 依赖
 */

/**
 * 按维度求和：每维度 2 题，分值相加 (范围 2-6)
 * @param {Object} answers  { q1: 2, q3: 1, ... }
 * @param {Array}  questions 题目定义数组
 * @returns {Object} { S1: 5, S2: 3, ... }
 */
export function calcDimensionScores(answers, questions) {
  const scores = {}
  for (const q of questions) {
    if (answers[q.id] == null) continue
    scores[q.dim] = (scores[q.dim] || 0) + answers[q.id]
  }
  return scores
}

/**
 * 原始分 → L/M/H 等级
 * @param {Object} scores      { S1: 5, ... }
 * @param {Object} thresholds  { L: [2,3], M: [4,4], H: [5,6] }
 * @returns {Object} { S1: 'H', S2: 'L', ... }
 */
export function scoresToLevels(scores, thresholds) {
  const levels = {}
  for (const [dim, score] of Object.entries(scores)) {
    if (score <= thresholds.L[1]) levels[dim] = 'L'
    else if (score >= thresholds.H[0]) levels[dim] = 'H'
    else levels[dim] = 'M'
  }
  return levels
}

/**
 * 等级 → 数值 (L=1, M=2, H=3)
 */
const LEVEL_NUM = { L: 1, M: 2, H: 3 }

/**
 * 解析人格类型的 pattern 字符串
 * "HHH-HMH-MHH-HHH-MHM" → ['H','H','H','H','M','H','M','H','H','H','H','H','M','H','M']
 */
export function parsePattern(pattern) {
  return pattern.replace(/-/g, '').split('')
}

/**
 * 计算用户向量与类型 pattern 的曼哈顿距离
 * @param {Object} userLevels  { S1: 'H', S2: 'L', ... }
 * @param {Array}  dimOrder    ['S1','S2','S3','E1',...]
 * @param {string} pattern     "HHH-HMH-MHH-HHH-MHM"
 * @returns {{ distance: number, exact: number, similarity: number }}
 */
export function matchType(userLevels, dimOrder, pattern) {
  const typeLevels = parsePattern(pattern)
  let distance = 0
  let exact = 0

  for (let i = 0; i < dimOrder.length; i++) {
    const userVal = LEVEL_NUM[userLevels[dimOrder[i]]] || 2
    const typeVal = LEVEL_NUM[typeLevels[i]] || 2
    const diff = Math.abs(userVal - typeVal)
    distance += diff
    if (diff === 0) exact++
  }

  const similarity = Math.max(0, Math.round((1 - distance / 30) * 100))
  return { distance, exact, similarity }
}

/**
 * 匹配所有类型，排序，应用特殊覆盖
 * @param {Object}  userLevels   { S1: 'H', ... }
 * @param {Array}   dimOrder     维度顺序
 * @param {Array}   standardTypes 标准类型数组
 * @param {Array}   specialTypes  特殊类型数组
 * @param {Object}  options      { isDrunk: boolean }
 * @returns {{ primary: Object, secondary: Object|null, rankings: Array, mode: string }}
 */
export function determineResult(userLevels, dimOrder, standardTypes, specialTypes, options = {}) {
  const rankings = standardTypes.map((type) => ({
    ...type,
    ...matchType(userLevels, dimOrder, type.pattern),
  }))

  // 排序：距离升序 → 精准命中降序 → 相似度降序
  rankings.sort((a, b) => a.distance - b.distance || b.exact - a.exact || b.similarity - a.similarity)

  const best = rankings[0]
  const drunk = specialTypes.find((t) => t.code === 'DRUNK')
  const hhhh = specialTypes.find((t) => t.code === 'HHHH')

  // 酒鬼覆盖
  if (options.isDrunk && drunk) {
    return {
      primary: { ...drunk, similarity: best.similarity, exact: best.exact },
      secondary: best,
      rankings,
      mode: 'drunk',
    }
  }

  // 傻乐者兜底
  if (best.similarity < 60 && hhhh) {
    return {
      primary: { ...hhhh, similarity: best.similarity, exact: best.exact },
      secondary: best,
      rankings,
      mode: 'fallback',
    }
  }

  return {
    primary: best,
    secondary: rankings[1] || null,
    rankings,
    mode: 'normal',
  }
}
