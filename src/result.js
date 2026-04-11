import { drawRadar } from './chart.js'
import { generateShareImage } from './share.js'
import { getBestMatch, getCompatibilityRankings, getRelationshipType } from './matcher.js'

const LEVEL_LABEL = { L: '低', M: '中', H: '高' }
const LEVEL_CLASS = { L: 'level-low', M: 'level-mid', H: 'level-high' }

/**
 * 渲染测试结果
 */
export function renderResult(result, userLevels, dimOrder, dimDefs, config, typesData) {
  const { primary, secondary, mode } = result

  // Kicker
  const kicker = document.getElementById('result-kicker')
  if (mode === 'drunk') kicker.textContent = '隐藏人格已激活'
  else if (mode === 'fallback') kicker.textContent = '系统强制兜底'
  else kicker.textContent = '你的主类型'

  // 主类型
  document.getElementById('result-code').textContent = primary.code
  document.getElementById('result-name').textContent = primary.cn

  // 匹配度
  document.getElementById('result-badge').textContent =
    `匹配度 ${primary.similarity}%` + (primary.exact != null ? ` · 精准命中 ${primary.exact}/15 维` : '')

  // Intro & 描述
  document.getElementById('result-intro').textContent = primary.intro || ''
  document.getElementById('result-desc').textContent = primary.desc || ''

  // 次要匹配
  const secEl = document.getElementById('result-secondary')
  if (secondary && (mode === 'drunk' || mode === 'fallback')) {
    secEl.style.display = ''
    document.getElementById('secondary-info').textContent =
      `${secondary.code}（${secondary.cn}）· 匹配度 ${secondary.similarity}%`
  } else {
    secEl.style.display = 'none'
  }

  // 雷达图
  const canvas = document.getElementById('radar-chart')
  drawRadar(canvas, userLevels, dimOrder, dimDefs)

  // 渲染维度详情（默认折叠）
  renderDimensionDetails(userLevels, dimOrder, dimDefs)

  // 渲染搭子匹配器结果（包含最佳搭子 + 全类型匹配榜平铺展示）
  renderMatcherResult(primary, secondary, typesData)

  // 免责声明
  document.getElementById('disclaimer').textContent =
    mode === 'normal' ? config.display.funNote : config.display.funNoteSpecial

  // 下载分享图
  const btnDownload = document.getElementById('btn-download')
  btnDownload.onclick = () => {
    generateShareImage(primary, userLevels, dimOrder, dimDefs, mode, window._matcherData)
  }

  // 复制 AI Agent 命令
  const btnAgent = document.getElementById('btn-agent')
  btnAgent.onclick = () => {
    const cmd = `git clone https://github.com/pingfanfan/SBTI.git && cd SBTI && npm install && npm run dev`
    navigator.clipboard.writeText(cmd).then(() => {
      btnAgent.textContent = '已复制!'
      setTimeout(() => { btnAgent.textContent = '复制一键部署命令' }, 2000)
    })
  }
}

/**
 * 渲染维度详情（可折叠）
 */
function renderDimensionDetails(userLevels, dimOrder, dimDefs) {
  const detailEl = document.getElementById('dimensions-detail')
  const toggleEl = document.getElementById('dimensions-toggle')

  if (!detailEl || !toggleEl) return

  // 清空内容
  detailEl.innerHTML = ''

  // 渲染维度行
  for (const dim of dimOrder) {
    const level = userLevels[dim] || 'M'
    const def = dimDefs[dim]
    if (!def) continue

    const row = document.createElement('div')
    row.className = 'dim-row'
    row.innerHTML = `
      <div class="dim-header">
        <span class="dim-name">${def.name}</span>
        <span class="dim-level ${LEVEL_CLASS[level]}">${LEVEL_LABEL[level]}</span>
      </div>
      <div class="dim-desc">${def.levels[level]}</div>
    `
    detailEl.appendChild(row)
  }

  // 默认折叠状态
  detailEl.style.display = 'none'
  toggleEl.innerHTML = '🔽 展开查看十五维度评分'

  // 点击切换展开/折叠
  toggleEl.onclick = () => {
    const isHidden = detailEl.style.display === 'none'
    detailEl.style.display = isHidden ? 'block' : 'none'
    toggleEl.innerHTML = isHidden ? '🔼 收起十五维度评分' : '🔽 展开查看十五维度评分'
  }
}

/**
 * 渲染搭子匹配器结果
 */
function renderMatcherResult(primary, secondary, typesData) {
  // 获取当前类型的完整信息
  let myType = typesData.standard.find(t => t.code === primary.code)

  // 特殊类型（DRUNK、HHHH）在 types.standard 中找不到
  // 此时使用次要匹配的类型来计算搭子
  if (!myType && secondary) {
    myType = typesData.standard.find(t => t.code === secondary.code)
  }

  if (!myType) return

  // 计算最佳搭子
  const bestMatch = getBestMatch(myType.pattern, myType.code)
  if (!bestMatch) return

  // 保存匹配数据供分享使用
  // 对于特殊类型（DRUNK/HHHH），显示次要匹配类型的搭子信息
  window._matcherData = {
    bestMatch,
    myCode: myType.code,
    myPattern: myType.pattern
  }

  // 计算所有匹配度
  const allRankings = getCompatibilityRankings(myType.pattern, myType.code)

  // 按关系类型分组
  const groups = {}
  allRankings.forEach(r => {
    if (!groups[r.relationLabel]) {
      groups[r.relationLabel] = []
    }
    groups[r.relationLabel].push(r)
  })

  // 查找或创建匹配器容器
  let matcherEl = document.getElementById('matcher-section')
  if (!matcherEl) {
    matcherEl = document.createElement('div')
    matcherEl.id = 'matcher-section'
    matcherEl.className = 'matcher-section'

    // 插入到合适的位置（在雷达图之后）
    const radarChart = document.getElementById('radar-chart')
    radarChart.parentNode.insertBefore(matcherEl, radarChart.nextSibling)
  }

  // 渲染最佳搭子卡片 + 全类型匹配榜（平铺展示）
  const relationOrder = ['灵魂伴侣', '最佳拍档', '合拍伙伴', '普通朋友', '欢喜冤家', '火星撞地球']

  matcherEl.innerHTML = `
    <h3 class="section-title matcher-title">💕 你的最佳搭子</h3>
    <div class="best-match-card">
      <div class="best-match-header">
        <span class="best-match-emoji">${bestMatch.relationEmoji}</span>
        <div class="best-match-badge">${bestMatch.relationLabel}</div>
      </div>
      <div class="best-match-type">
        <div class="best-match-code">${bestMatch.code}</div>
        <div class="best-match-name">${bestMatch.cn}</div>
      </div>
      <div class="best-match-score">
        <span class="score-value">${bestMatch.score}%</span>
        <span class="score-label">匹配度</span>
      </div>
      <div class="best-match-desc">${bestMatch.relationDesc}</div>
      <div class="best-match-quote">"${bestMatch.intro}"</div>
    </div>

    <h3 class="section-title rankings-title">🔮 全类型匹配榜</h3>
    <div class="rankings-flat">
      ${relationOrder.map(relation => {
        const types = groups[relation] || []
        if (types.length === 0) return ''
        const emoji = types[0].relationEmoji
        return `
          <div class="ranking-group-flat">
            <div class="ranking-group-header-flat">
              <span class="ranking-emoji">${emoji}</span>
              <span class="ranking-label">${relation}</span>
              <span class="ranking-count">${types.length}个</span>
            </div>
            <div class="ranking-types">
              ${types.map(t => `
                <div class="ranking-type-tag ${t.isSelf ? 'is-self' : ''}">
                  <span class="type-code">${t.code}</span>
                  <span class="type-name">${t.cn}</span>
                  <span class="type-score">${t.score}%</span>
                </div>
              `).join('')}
            </div>
          </div>
        `
      }).join('')}
    </div>
  `
}
