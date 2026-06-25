// app.ts
App<IAppOption>({
  globalData: {},
  onLaunch() {
    // 初始化云开发
    wx.cloud.init({
      env: 'prod-d5gom78c0baa72fbe',
    })

    // 展示本地存储能力
    const logs = wx.getStorageSync('logs') || []
    logs.unshift(Date.now())
    wx.setStorageSync('logs', logs)

    // 登录
    wx.login({
      success: res => {
        console.log(res.code)
        // 发送 res.code 到后台换取 openId, sessionKey, unionId
      },
    })
  },
})