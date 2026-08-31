/**
 * 页面视口绑定
 *
 * 每个页面根节点都要把屏幕档案里的定位信息内联到 style 上（beta 胶囊宿主会按
 * 466px 圆表宽度布局，必须由应用显式纠正，详见 docs/COMPATIBILITY.md）。这段
 * 赋值以前在 20 个页面里逐字重复，新增一个字段就要改 20 处——`safeArea` 和
 * `logicalHeight` 就是这样漏掉的。
 *
 * 这里把「解析屏幕档案 → 写回页面视口字段」收敛成一处：
 *
 *   pageViewport.bind(this, function (profile) {
 *     // 只写本页面独有的逻辑
 *   })
 *
 * 页面仍在 private 里声明这些字段的初值（快应用要求 private 是字面量对象，
 * 框架据此建立响应式绑定），本模块只负责运行时写回。
 */
import screenProfile from './screen_profile'

// 页面 private 中必须声明的视口字段及其初值。
// 保持为普通对象而不是直接展开进 private，是因为快应用需要 private 字面量。
var DEFAULTS = {
  viewportClass: '',
  viewportPosition: 'relative',
  viewportLeft: '0px',
  viewportTop: '0px',
  viewportWidth: '100%',
  viewportHeight: '100%'
}

/**
 * 把屏幕档案的视口定位写回页面。
 * @param {object} page 页面 this
 * @param {object} profile screen_profile 解析结果
 */
function apply(page, profile) {
  if (!page || !profile) return
  page.viewportClass = profile.viewportClass
  page.viewportPosition = profile.viewportPosition
  page.viewportLeft = profile.viewportLeft
  page.viewportTop = profile.viewportTop
  page.viewportWidth = profile.viewportWidth
  page.viewportHeight = profile.viewportHeight
}

/**
 * 解析屏幕档案并完成视口绑定，再把档案交给页面做形态相关的初始化。
 *
 * @param {object} page 页面 this
 * @param {function} [callback] 拿到档案后的页面自有逻辑，参数为 profile
 */
function bind(page, callback) {
  screenProfile.resolve(page, function (profile) {
    apply(page, profile)
    if (typeof callback === 'function') callback(profile)
  })
}

module.exports = {
  DEFAULTS: DEFAULTS,
  apply: apply,
  bind: bind
}
