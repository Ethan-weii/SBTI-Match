/**
 * 生成分享图片 — 纯 Canvas 绘制，无外部依赖
 */

const LEVEL_NUM = { L: 1, M: 2, H: 3 }
const LEVEL_LABEL = { L: '低', M: '中', H: '高' }

/**
 * 生成分享卡片并下载
 */
export async function generateShareImage(primary, userLevels, dimOrder, dimDefs, mode, matcherData) {
  const dpr = 2
  const W = 720
  // 如果有匹配数据，增加高度以容纳匹配信息
  const baseH = matcherData ? 1500 : 1280
  const H = baseH
  const canvas = document.createElement('canvas')
  canvas.width = W * dpr
  canvas.height = H * dpr
  const ctx = canvas.getContext('2d')
  ctx.scale(dpr, dpr)

  // 背景
  ctx.fillStyle = '#f0f4f1'
  ctx.fillRect(0, 0, W, H)

  // 卡片白底
  const cardX = 32, cardY = 32, cardW = W - 64, cardH = H - 64
  roundRect(ctx, cardX, cardY, cardW, cardH, 20)
  ctx.fillStyle = '#ffffff'
  ctx.fill()
  ctx.shadowColor = 'transparent'

  let y = cardY + 48

  // Kicker
  ctx.textAlign = 'center'
  ctx.font = '400 22px system-ui, "PingFang SC", "Microsoft YaHei", sans-serif'
  ctx.fillStyle = '#6b7b6e'
  const kickerText = mode === 'drunk' ? '隐藏人格已激活' : mode === 'fallback' ? '系统强制兜底' : '你的主类型'
  ctx.fillText(kickerText, W / 2, y)
  y += 56

  // 类型代码
  ctx.font = '900 72px system-ui, "PingFang SC", "Microsoft YaHei", sans-serif'
  ctx.fillStyle = '#4c6752'
  ctx.fillText(primary.code, W / 2, y)
  y += 40

  // 中文名
  ctx.font = '600 32px system-ui, "PingFang SC", "Microsoft YaHei", sans-serif'
  ctx.fillStyle = '#2c3e2d'
  ctx.fillText(primary.cn, W / 2, y)
  y += 36

  // 匹配度徽章
  const badgeText = `匹配度 ${primary.similarity}%` + (primary.exact != null ? ` · 精准命中 ${primary.exact}/15 维` : '')
  ctx.font = '500 20px system-ui, "PingFang SC", "Microsoft YaHei", sans-serif'
  const badgeW = ctx.measureText(badgeText).width + 40
  roundRect(ctx, (W - badgeW) / 2, y - 16, badgeW, 36, 18)
  ctx.fillStyle = '#e8f0ea'
  ctx.fill()
  ctx.fillStyle = '#4c6752'
  ctx.fillText(badgeText, W / 2, y + 6)
  y += 44

  // Intro
  ctx.font = 'italic 600 22px system-ui, "PingFang SC", "Microsoft YaHei", sans-serif'
  ctx.fillStyle = '#2c3e2d'
  const introLines = wrapText(ctx, primary.intro || '', cardW - 80)
  for (const line of introLines) {
    ctx.fillText(line, W / 2, y)
    y += 30
  }
  y += 16

  // 雷达图
  const radarCx = W / 2
  const radarCy = y + 150
  const radarR = 130
  drawShareRadar(ctx, radarCx, radarCy, radarR, userLevels, dimOrder, dimDefs)
  y = radarCy + radarR + 40

  // 维度条形图
  y += 10
  ctx.textAlign = 'left'
  const barX = cardX + 48
  const barMaxW = cardW - 96
  const dimNameW = 110

  for (const dim of dimOrder) {
    const level = userLevels[dim] || 'M'
    const val = LEVEL_NUM[level]
    const def = dimDefs[dim]
    if (!def) continue

    const name = def.name.replace(/^[A-Za-z0-9]+\s*/, '')

    // 维度名
    ctx.font = '600 16px system-ui, "PingFang SC", "Microsoft YaHei", sans-serif'
    ctx.fillStyle = '#2c3e2d'
    ctx.fillText(name, barX, y)

    // 进度条背景
    const progX = barX + dimNameW
    const progW = barMaxW - dimNameW - 50
    const progH = 12
    roundRect(ctx, progX, y - 10, progW, progH, 6)
    ctx.fillStyle = '#e8f0ea'
    ctx.fill()

    // 进度条填充
    const fillW = (val / 3) * progW
    roundRect(ctx, progX, y - 10, fillW, progH, 6)
    ctx.fillStyle = val === 3 ? '#2d7a4a' : val === 2 ? '#4c6752' : '#b8860b'
    ctx.fill()

    // 等级标签
    ctx.textAlign = 'right'
    ctx.font = '600 14px system-ui, "PingFang SC", "Microsoft YaHei", sans-serif'
    ctx.fillStyle = val === 3 ? '#2d7a4a' : val === 2 ? '#4c6752' : '#b8860b'
    ctx.fillText(LEVEL_LABEL[level], barX + barMaxW, y)
    ctx.textAlign = 'left'

    y += 26
  }

  y += 16

  // 最佳搭子信息
  if (matcherData && matcherData.bestMatch) {
    const { bestMatch, myCode } = matcherData

    // 分隔线
    y += 20
    ctx.beginPath()
    ctx.moveTo(cardX + 48, y)
    ctx.lineTo(cardX + cardW - 48, y)
    ctx.strokeStyle = '#e8f0ea'
    ctx.lineWidth = 2
    ctx.stroke()
    y += 30

    // 搭子标题
    ctx.textAlign = 'center'
    ctx.font = '600 22px system-ui, "PingFang SC", "Microsoft YaHei", sans-serif'
    ctx.fillStyle = '#e85d75'
    ctx.fillText('💕 我的最佳搭子', W / 2, y)
    y += 36

    // 关系类型标签
    roundRect(ctx, (W - 140) / 2, y - 14, 140, 32, 16)
    ctx.fillStyle = '#ffd1dc'
    ctx.fill()
    ctx.font = '600 14px system-ui, "PingFang SC", "Microsoft YaHei", sans-serif'
    ctx.fillStyle = '#c44569'
    ctx.fillText(`${bestMatch.relationEmoji} ${bestMatch.relationLabel}`, W / 2, y + 4)
    y += 40

    // 搭子类型代码
    ctx.font = '900 48px system-ui, "PingFang SC", "Microsoft YaHei", sans-serif'
    ctx.fillStyle = '#c44569'
    ctx.fillText(bestMatch.code, W / 2, y)
    y += 32

    // 搭子类型名称
    ctx.font = '600 22px system-ui, "PingFang SC", "Microsoft YaHei", sans-serif'
    ctx.fillStyle = '#8b4557'
    ctx.fillText(bestMatch.cn, W / 2, y)
    y += 28

    // 匹配度
    ctx.font = '900 36px system-ui, "PingFang SC", "Microsoft YaHei", sans-serif'
    ctx.fillStyle = '#e85d75'
    ctx.fillText(`${bestMatch.score}%`, W / 2, y)
    y += 20
    ctx.font = '400 14px system-ui, "PingFang SC", "Microsoft YaHei", sans-serif'
    ctx.fillStyle = '#b76b7a'
    ctx.fillText('匹配度', W / 2, y)
    y += 28

    // 关系描述
    ctx.font = '400 16px system-ui, "PingFang SC", "Microsoft YaHei", sans-serif'
    ctx.fillStyle = '#8b4557'
    const descLines = wrapText(ctx, bestMatch.relationDesc, cardW - 120)
    for (const line of descLines.slice(0, 2)) {
      ctx.fillText(line, W / 2, y)
      y += 22
    }
    y += 10
  }

  // 底部水印
  ctx.textAlign = 'center'
  ctx.font = '400 18px system-ui, "PingFang SC", "Microsoft YaHei", sans-serif'
  ctx.fillStyle = '#aab8ac'
  ctx.fillText('SBTI 人格测试 · 仅供娱乐', W / 2, H - cardY - 24)

  // 下载
  const link = document.createElement('a')
  link.download = `SBTI-${primary.code}.png`
  link.href = canvas.toDataURL('image/png')
  link.click()
}

/**
 * 在分享图上绘制雷达图
 */
function drawShareRadar(ctx, cx, cy, maxR, userLevels, dimOrder, dimDefs) {
  const n = dimOrder.length
  const step = (Math.PI * 2) / n
  const start = -Math.PI / 2

  // 背景圆环
  for (let lv = 3; lv >= 1; lv--) {
    const r = (lv / 3) * maxR
    ctx.beginPath()
    ctx.arc(cx, cy, r, 0, Math.PI * 2)
    ctx.fillStyle = lv === 3 ? 'rgba(76,103,82,0.06)' : lv === 2 ? 'rgba(76,103,82,0.04)' : 'rgba(76,103,82,0.02)'
    ctx.fill()
    ctx.strokeStyle = 'rgba(76,103,82,0.12)'
    ctx.lineWidth = 0.5
    ctx.stroke()
  }

  // 轴线 + 标签
  ctx.font = '400 12px system-ui, "PingFang SC", "Microsoft YaHei", sans-serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'

  for (let i = 0; i < n; i++) {
    const angle = start + i * step
    const x = cx + Math.cos(angle) * maxR
    const y = cy + Math.sin(angle) * maxR
    ctx.beginPath()
    ctx.moveTo(cx, cy)
    ctx.lineTo(x, y)
    ctx.strokeStyle = 'rgba(76,103,82,0.1)'
    ctx.lineWidth = 0.5
    ctx.stroke()

    const lr = maxR + 24
    const lx = cx + Math.cos(angle) * lr
    const ly = cy + Math.sin(angle) * lr
    const label = (dimDefs[dimOrder[i]]?.name || dimOrder[i]).replace(/^[A-Za-z0-9]+\s*/, '')
    ctx.fillStyle = '#6b7b6e'
    ctx.fillText(label, lx, ly)
  }

  // 数据多边形
  const values = dimOrder.map((d) => LEVEL_NUM[userLevels[d]] || 2)
  ctx.beginPath()
  for (let i = 0; i < n; i++) {
    const angle = start + i * step
    const r = (values[i] / 3) * maxR
    const x = cx + Math.cos(angle) * r
    const y = cy + Math.sin(angle) * r
    if (i === 0) ctx.moveTo(x, y)
    else ctx.lineTo(x, y)
  }
  ctx.closePath()
  ctx.fillStyle = 'rgba(76,103,82,0.2)'
  ctx.fill()
  ctx.strokeStyle = 'rgba(76,103,82,0.6)'
  ctx.lineWidth = 2
  ctx.stroke()

  // 数据点
  for (let i = 0; i < n; i++) {
    const angle = start + i * step
    const r = (values[i] / 3) * maxR
    const x = cx + Math.cos(angle) * r
    const y = cy + Math.sin(angle) * r
    ctx.beginPath()
    ctx.arc(x, y, 3, 0, Math.PI * 2)
    ctx.fillStyle = '#4c6752'
    ctx.fill()
  }
}

/**
 * 圆角矩形
 */
function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.lineTo(x + w - r, y)
  ctx.quadraticCurveTo(x + w, y, x + w, y + r)
  ctx.lineTo(x + w, y + h - r)
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h)
  ctx.lineTo(x + r, y + h)
  ctx.quadraticCurveTo(x, y + h, x, y + h - r)
  ctx.lineTo(x, y + r)
  ctx.quadraticCurveTo(x, y, x + r, y)
  ctx.closePath()
}

/**
 * 文字自动换行
 */
function wrapText(ctx, text, maxWidth) {
  if (!text) return []
  const lines = []
  let line = ''
  for (const char of text) {
    const test = line + char
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line)
      line = char
    } else {
      line = test
    }
  }
  if (line) lines.push(line)
  return lines
}
