/**
 * 生成分享图片 — 纯 Canvas 绘制，无外部依赖
 */

const LEVEL_NUM = { L: 1, M: 2, H: 3 }

/**
 * 生成分享卡片并下载
 */
export async function generateShareImage(primary, userLevels, dimOrder, dimDefs, mode, matcherData) {
  const dpr = 2
  const W = 720
  const hasBestMatch = matcherData?.bestMatch

  // 计算各部分高度
  const headerHeight = 180        // 标题 + 类型代码 + 名称 + 徽章
  const radarHeight = 240         // 雷达图区域
  const matchCardHeight = hasBestMatch ? 260 : 0  // 最佳搭子卡片
  const padding = 48              // 上下内边距
  const sectionGap = 24           // 区块间距

  // 总高度 = 内边距 + 头部 + 间距 + 雷达图 + 间距 + 最佳搭子 + 间距 + 水印
  const contentHeight = padding + headerHeight + sectionGap + radarHeight + (hasBestMatch ? sectionGap + matchCardHeight : 0) + sectionGap + 30
  const H = contentHeight

  const canvas = document.createElement('canvas')
  canvas.width = W * dpr
  canvas.height = H * dpr
  const ctx = canvas.getContext('2d')
  ctx.scale(dpr, dpr)

  // 背景
  ctx.fillStyle = '#f0f4f1'
  ctx.fillRect(0, 0, W, H)

  // 卡片白底
  const cardX = 32, cardY = 32, cardW = W - 64
  ctx.fillStyle = '#ffffff'
  roundRect(ctx, cardX, cardY, cardW, H - 64, 20)
  ctx.fill()

  let y = cardY + 24

  // 标题
  ctx.textAlign = 'center'
  ctx.font = '400 16px system-ui, "PingFang SC", sans-serif'
  ctx.fillStyle = '#6b7b6e'
  const kickerText = mode === 'drunk' ? '隐藏人格已激活' : mode === 'fallback' ? '系统强制兜底' : '我的 SBTI 类型'
  ctx.fillText(kickerText, W / 2, y)
  y += 36

  // 类型代码
  ctx.font = '900 60px system-ui, "PingFang SC", sans-serif'
  ctx.fillStyle = '#4c6752'
  ctx.fillText(primary.code, W / 2, y)
  y += 32

  // 中文名
  ctx.font = '600 22px system-ui, "PingFang SC", sans-serif'
  ctx.fillStyle = '#2c3e2d'
  ctx.fillText(primary.cn, W / 2, y)
  y += 28

  // 匹配度徽章
  const badgeText = `匹配度 ${primary.similarity}%` + (primary.exact != null ? ` · ${primary.exact}/15维` : '')
  ctx.font = '500 15px system-ui, "PingFang SC", sans-serif'
  const badgeW = ctx.measureText(badgeText).width + 24
  ctx.fillStyle = '#e8f0ea'
  roundRect(ctx, (W - badgeW) / 2, y - 10, badgeW, 26, 13)
  ctx.fill()
  ctx.fillStyle = '#4c6752'
  ctx.fillText(badgeText, W / 2, y + 4)
  y += 36

  // 雷达图
  const radarCx = W / 2
  const radarCy = y + 90
  const radarR = 90
  drawShareRadar(ctx, radarCx, radarCy, radarR, userLevels, dimOrder, dimDefs)
  y = radarCy + radarR + 24

  // 最佳搭子
  if (hasBestMatch) {
    const { bestMatch } = matcherData
    const matchCardX = cardX + 24
    const matchCardW = cardW - 48
    const matchCardY = y

    // 粉色背景卡片
    ctx.fillStyle = '#fef5f7'
    roundRect(ctx, matchCardX, matchCardY, matchCardW, 240, 14)
    ctx.fill()

    // 边框
    ctx.strokeStyle = '#ffd1dc'
    ctx.lineWidth = 2
    ctx.stroke()

    let my = matchCardY + 18

    // 关系标签
    ctx.textAlign = 'center'
    ctx.fillStyle = '#ff6b9d'
    roundRect(ctx, (W - 90) / 2, my - 8, 90, 24, 12)
    ctx.fill()
    ctx.font = '600 12px system-ui, "PingFang SC", sans-serif'
    ctx.fillStyle = '#ffffff'
    ctx.fillText(`${bestMatch.relationEmoji} ${bestMatch.relationLabel}`, W / 2, my + 4)
    my += 30

    // 搭子代码
    ctx.font = '900 36px system-ui, "PingFang SC", sans-serif'
    ctx.fillStyle = '#c44569'
    ctx.fillText(bestMatch.code, W / 2, my)
    my += 26

    // 搭子名称
    ctx.font = '500 16px system-ui, "PingFang SC", sans-serif'
    ctx.fillStyle = '#8b4557'
    ctx.fillText(bestMatch.cn, W / 2, my)
    my += 24

    // 匹配度
    ctx.font = '900 28px system-ui, "PingFang SC", sans-serif'
    ctx.fillStyle = '#e85d75'
    ctx.fillText(`${bestMatch.score}%`, W / 2, my)
    my += 14
    ctx.font = '400 11px system-ui, "PingFang SC", sans-serif'
    ctx.fillStyle = '#b76b7a'
    ctx.fillText('匹配度', W / 2, my)
    my += 20

    // 描述
    ctx.font = '400 13px system-ui, "PingFang SC", sans-serif'
    ctx.fillStyle = '#8b4557'
    const descLines = wrapText(ctx, bestMatch.relationDesc, matchCardW - 40)
    for (const line of descLines.slice(0, 2)) {
      ctx.fillText(line, W / 2, my)
      my += 18
    }

    y = matchCardY + 260
  }

  // 底部水印
  ctx.font = '400 14px system-ui, "PingFang SC", sans-serif'
  ctx.fillStyle = '#aab8ac'
  ctx.fillText('SBTI 搭子匹配器', W / 2, y + 20)

  // 下载
  const link = document.createElement('a')
  link.download = `SBTI-${primary.code}.png`
  link.href = canvas.toDataURL('image/png')
  link.click()
}

/**
 * 绘制雷达图
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
    ctx.strokeStyle = 'rgba(76,103,82,0.1)'
    ctx.lineWidth = 1
    ctx.stroke()
  }

  // 轴线 + 标签
  ctx.font = '400 10px system-ui, "PingFang SC", sans-serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'

  for (let i = 0; i < n; i++) {
    const angle = start + i * step
    const x = cx + Math.cos(angle) * maxR
    const y = cy + Math.sin(angle) * maxR
    ctx.beginPath()
    ctx.moveTo(cx, cy)
    ctx.lineTo(x, y)
    ctx.strokeStyle = 'rgba(76,103,82,0.08)'
    ctx.lineWidth = 1
    ctx.stroke()

    const lr = maxR + 18
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
  ctx.fillStyle = 'rgba(76,103,82,0.18)'
  ctx.fill()
  ctx.strokeStyle = '#4c6752'
  ctx.lineWidth = 2
  ctx.stroke()

  // 数据点
  for (let i = 0; i < n; i++) {
    const angle = start + i * step
    const r = (values[i] / 3) * maxR
    const x = cx + Math.cos(angle) * r
    const y = cy + Math.sin(angle) * r
    ctx.beginPath()
    ctx.arc(x, y, 4, 0, Math.PI * 2)
    ctx.fillStyle = '#4c6752'
    ctx.fill()
  }
}

/**
 * 圆角矩形 - 只创建路径，不填充
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
