/**
 * SBTI 搭子匹配器
 * 基于曼哈顿距离计算任意两种人格类型的匹配度
 */

import typesData from '../data/types.json'

// 等级到数值的映射
const LEVEL_VALUE = { L: 1, M: 2, H: 3 }

// 匹配关系类型定义
const RELATIONSHIP_TYPES = [
  {
    minScore: 90,
    maxScore: 100,
    type: 'soulmate',
    label: '灵魂伴侣',
    emoji: '💫',
    desc: '你们几乎完全相同，心有灵犀，一个眼神就能读懂彼此'
  },
  {
    minScore: 77,
    maxScore: 89,
    type: 'partner',
    label: '最佳拍档',
    emoji: '🤝',
    desc: '高度互补，默契十足，是彼此最强的后盾'
  },
  {
    minScore: 63,
    maxScore: 76,
    type: 'friend',
    label: '合拍伙伴',
    emoji: '👥',
    desc: '相处融洽，志同道合，能一起创造美好回忆'
  },
  {
    minScore: 50,
    maxScore: 62,
    type: 'normal',
    label: '普通朋友',
    emoji: '😐',
    desc: '平平淡淡，相安无事，保持礼貌的距离'
  },
  {
    minScore: 37,
    maxScore: 49,
    type: 'frenemy',
    label: '欢喜冤家',
    emoji: '⚡️',
    desc: '性格迥异，相爱相杀，碰撞出意想不到的火花'
  },
  {
    minScore: 0,
    maxScore: 36,
    type: 'clash',
    label: '火星撞地球',
    emoji: '💥',
    desc: '天差地别，难以理解，可能需要更多包容'
  }
]

/**
 * 解析模式串为数值向量
 * @param {string} pattern - 如 "HHH-HMH-MHH-HHH-MHM"
 * @returns {number[]} 数值向量
 */
function parsePattern(pattern) {
  if (!pattern) return null
  return pattern.replace(/-/g, '').split('').map(c => LEVEL_VALUE[c] || 2)
}

/**
 * 计算曼哈顿距离
 * @param {number[]} vectorA
 * @param {number[]} vectorB
 * @returns {number} 距离 (0-30)
 */
function manhattanDistance(vectorA, vectorB) {
  if (!vectorA || !vectorB || vectorA.length !== vectorB.length) return 30
  return vectorA.reduce((sum, a, i) => sum + Math.abs(a - vectorB[i]), 0)
}

/**
 * 计算两个类型的匹配度
 * @param {string} patternA - 类型A的模式串
 * @param {string} patternB - 类型B的模式串
 * @returns {Object} { score: 0-100, distance: 0-30 }
 */
export function calculateCompatibility(patternA, patternB) {
  const vectorA = parsePattern(patternA)
  const vectorB = parsePattern(patternB)

  if (!vectorA || !vectorB) {
    return { score: 0, distance: 30 }
  }

  const distance = manhattanDistance(vectorA, vectorB)
  const score = Math.max(0, Math.round((1 - distance / 30) * 100))

  return { score, distance }
}

/**
 * 获取匹配关系类型
 * @param {number} score - 匹配度分数 0-100
 * @returns {Object} 关系类型对象
 */
export function getRelationshipType(score) {
  return RELATIONSHIP_TYPES.find(r => score >= r.minScore && score <= r.maxScore) ||
         RELATIONSHIP_TYPES[RELATIONSHIP_TYPES.length - 1]
}

/**
 * 计算某类型与所有其他类型的匹配度排行榜
 * @param {string} myPattern - 我的类型模式串
 * @param {string} myCode - 我的类型代码
 * @returns {Array} 匹配度排行榜，按分数降序排列
 */
export function getCompatibilityRankings(myPattern, myCode) {
  const standardTypes = typesData.standard

  const rankings = standardTypes.map(type => {
    const { score, distance } = calculateCompatibility(myPattern, type.pattern)
    const relation = getRelationshipType(score)

    return {
      code: type.code,
      cn: type.cn,
      pattern: type.pattern,
      score,
      distance,
      relationType: relation.type,
      relationLabel: relation.label,
      relationEmoji: relation.emoji,
      relationDesc: relation.desc,
      isSelf: type.code === myCode
    }
  })

  // 按分数降序排列，相同分数时距离短的在前
  return rankings.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score
    return a.distance - b.distance
  })
}

/**
 * 获取最佳搭子（匹配度最高的非自己类型）
 * @param {string} myPattern - 我的类型模式串
 * @param {string} myCode - 我的类型代码
 * @returns {Object} 最佳搭子信息
 */
export function getBestMatch(myPattern, myCode) {
  const rankings = getCompatibilityRankings(myPattern, myCode)

  // 找到第一个非自己的类型（如果是100%匹配，那可能是相同的类型）
  const bestMatch = rankings.find(r => !r.isSelf) || rankings[0]

  if (!bestMatch) return null

  const typeInfo = typesData.standard.find(t => t.code === bestMatch.code)

  return {
    ...bestMatch,
    intro: typeInfo?.intro || '',
    desc: typeInfo?.desc || ''
  }
}

/**
 * 获取匹配解读
 * @param {string} myCode - 我的类型代码
 * @param {string} matchCode - 匹配类型的代码
 * @param {number} score - 匹配度
 * @returns {string} 解读文本
 */
export function getMatchInterpretation(myCode, matchCode, score) {
  const relation = getRelationshipType(score)

  const interpretations = {
    soulmate: [
      `你们就像镜子里的彼此，${matchCode}完全理解你的想法`,
      `和${matchCode}在一起，你不需要解释，TA都懂`,
      `这是一种 rare 的缘分，遇到${matchCode}请珍惜`
    ],
    partner: [
      `${matchCode}是你最强的后盾，你们配合天衣无缝`,
      `你负责冲锋，${matchCode}负责兜底，完美组合`,
      `和${matchCode}搭档，1+1 绝对大于 2`
    ],
    friend: [
      `${matchCode}是你的舒适区，相处轻松愉快`,
      `你们有不少共同点，能聊得来也玩得来`,
      `和${matchCode}做朋友，生活多了份温暖`
    ],
    normal: [
      `和${matchCode}保持礼貌距离，井水不犯河水`,
      `你们可能没什么共同话题，但也不会冲突`,
      `对${matchCode}保持平常心就好`
    ],
    frenemy: [
      `${matchCode}总让你又爱又恨，这就是孽缘`,
      `你们互相看不顺眼，却又莫名被吸引`,
      `和${matchCode}在一起，永远不缺戏剧性`
    ],
    clash: [
      `${matchCode}和你简直是两个世界的人`,
      `你们可能永远无法理解对方的脑回路`,
      `遇到${matchCode}，建议各自安好`
    ]
  }

  const list = interpretations[relation.type] || interpretations.normal
  return list[Math.floor(Math.random() * list.length)]
}

/**
 * 获取两个类型的详细对比分析
 * @param {string} patternA
 * @param {string} patternB
 * @returns {Object} 对比分析结果
 */
export function getDetailedComparison(patternA, patternB) {
  const vectorA = parsePattern(patternA)
  const vectorB = parsePattern(patternB)

  if (!vectorA || !vectorB) return null

  const dimensions = [
    'S1', 'S2', 'S3', 'E1', 'E2', 'E3',
    'A1', 'A2', 'A3', 'Ac1', 'Ac2', 'Ac3',
    'So1', 'So2', 'So3'
  ]

  const differences = dimensions.map((dim, i) => {
    const diff = Math.abs(vectorA[i] - vectorB[i])
    return { dimension: dim, diff, valueA: vectorA[i], valueB: vectorB[i] }
  }).filter(d => d.diff > 0)
    .sort((a, b) => b.diff - a.diff)

  const sameCount = 15 - differences.length

  return {
    sameCount,
    differenceCount: differences.length,
    largestGaps: differences.slice(0, 3),
    similarity: Math.round((sameCount / 15) * 100)
  }
}

export { RELATIONSHIP_TYPES }
