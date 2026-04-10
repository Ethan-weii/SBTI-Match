import { drawRadar } from './chart.js'
import { generateShareImage } from './share.js'
import { getBestMatch, getCompatibilityRankings, getRelationshipType, getMatchInterpretation } from './matcher.js'

const LEVEL_LABEL = { L: '低', M: '中', H: '高' }
const LEVEL_CLASS = { L: 'level-low', M: 'level-mid', H: 'level-high' }

/**
 * 渲染测试结果
 */
export function renderResult(result, userLevels, dimOrder, dimDefs, config, typesData) {
  const { primary, secondary, rankings, mode } = result

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

  // 渲染搭子匹配器结果
  renderMatcherResult(primary, typesData)

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

  // 维度详情
  const detailEl = document.getElementById('dimensions-detail')
  detailEl.innerHTML = ''
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

  // TOP 5
  const topEl = document.getElementById('top-list')
  topEl.innerHTML = ''
  const top5 = rankings.slice(0, 5)
  top5.forEach((t, i) => {
    const item = document.createElement('div')
    item.className = 'top-item'
    item.innerHTML = `
      <span class="top-rank">#${i + 1}</span>
      <span class="top-code">${t.code}</span>
      <span class="top-name">${t.cn}</span>
      <span class="top-sim">${t.similarity}%</span>
    `
    topEl.appendChild(item)
  })

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
 * 渲染搭子匹配器结果
 */
function renderMatcherResult(primary, typesData) {
  // 获取当前类型的完整信息
  const myType = typesData.standard.find(t => t.code === primary.code)
  if (!myType) return

  // 计算最佳搭子
  const bestMatch = getBestMatch(myType.pattern, myType.code)
  if (!bestMatch) return

  // 保存匹配数据供分享使用
  window._matcherData = {
    bestMatch,
    myCode: primary.code,
    myPattern: myType.pattern
  }

  // 查找或创建匹配器容器
  let matcherEl = document.getElementById('matcher-section')
  if (!matcherEl) {
    matcherEl = document.createElement('div')
    matcherEl.id = 'matcher-section'
    matcherEl.className = 'matcher-section'

    // 插入到雷达图之前
    const radarChart = document.getElementById('radar-chart')
    radarChart.parentNode.insertBefore(matcherEl, radarChart)
  }

  // 渲染最佳搭子卡片
  matcherEl.innerHTML = `
    <h3 class="section-title">💕 你的最佳搭子</h3>
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
    <button id="btn-view-rankings" class="btn btn-secondary btn-full">查看全类型匹配榜</button>
  `

  // 绑定查看排行榜按钮事件
  document.getElementById('btn-view-rankings').onclick = () => {
    showCompatibilityRankings(myType.pattern, myType.code, typesData)
  }
}

/**
 * 显示全类型匹配排行榜
 */
function showCompatibilityRankings(myPattern, myCode, typesData) {
  // 创建或获取模态框
  let modal = document.getElementById('rankings-modal')
  if (!modal) {
    modal = document.createElement('div')
    modal.id = 'rankings-modal'
    modal.className = 'modal'
    document.body.appendChild(modal)
  }

  // 计算所有匹配度
  const rankings = getCompatibilityRankings(myPattern, myCode)

  // 按关系类型分组
  const groups = {}
  rankings.forEach(r => {
    if (!groups[r.relationLabel]) {
      groups[r.relationLabel] = []
    }
    groups[r.relationLabel].push(r)
  })

  // 渲染模态框内容
  const relationOrder = ['灵魂伴侣', '最佳拍档', '合拍伙伴', '普通朋友', '欢喜冤家', '火星撞地球']

  modal.innerHTML = `
    <div class="modal-content">
      <div class="modal-header">
        <h3>🔮 全类型匹配榜</h3>
        <button class="modal-close" onclick="this.closest('.modal').style.display='none'">✕</button>
      </div>
      <div class="modal-body">
        ${relationOrder.map(relation => {
          const types = groups[relation] || []
          if (types.length === 0) return ''
          const emoji = types[0].relationEmoji
          return `
            <div class="ranking-group">
              <div class="ranking-group-header">
                <span>${emoji} ${relation}</span>
                <span class="ranking-count">${types.length}个</span>
              </div>
              <div class="ranking-list">
                ${types.map(t => `
                  <div class="ranking-item ${t.isSelf ? 'is-self' : ''}">
                    <span class="ranking-code">${t.code}</span>
                    <span class="ranking-name">${t.cn}</span>
                    <span class="ranking-score">${t.score}%</span>
                  </div>
                `).join('')}
              </div>
            </div>
          `
        }).join('')}
      </div>
    </div>
  `

  modal.style.display = 'flex'

  // 点击外部关闭
  modal.onclick = (e) => {
    if (e.target === modal) modal.style.display = 'none'
  }
}
