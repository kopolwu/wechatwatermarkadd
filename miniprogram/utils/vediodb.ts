/**
 * 豆包视频去水印 - 通过微信云托管 callContainer 调用
 * 无需配置公网域名，微信内部服务发现直接访问
 */

/** 解析豆包视频链接的返回结果 */
export interface VediodbParseResult {
  code: number;
  msg?: string;
  body?: {
    type?: number;          // 2=视频, 其他=图集
    text?: string;          // 文案
    cover?: string;         // 封面图
    video_info?: {
      url_dl?: string;      // 视频直链
      url_bk?: string;      // 备用链接（代理下载）
      url?: string;         // 原始链接
      cover?: string;       // 视频封面
    };
    images?: string[];      // 图片列表
  };
}

/**
 * 解析豆包视频分享链接，获取无水印视频/图片
 * 通过 wx.cloud.callContainer 直接调用云托管服务
 * @param videoUrl 豆包分享链接
 * @returns Promise<VediodbParseResult>
 */
export function parseVediodbUrl(videoUrl: string): Promise<VediodbParseResult> {
  return new Promise((resolve, reject) => {
    wx.cloud.callContainer({
      config: {
        env: 'prod-d5gom78c0baa72fbe',
      },
      path: '/api/vediodb/parse',
      header: {
        'X-WX-SERVICE': 'flask-dyg3',
        'Content-Type': 'application/json',
      },
      method: 'POST',
      data: { url: videoUrl },
      timeout: 30000,
      success: (res) => {
        if (res.statusCode === 200) {
          const data = res.data as VediodbParseResult;
          resolve(data);
        } else {
          reject(new Error(`请求失败，状态码: ${res.statusCode}`));
        }
      },
      fail: (err) => {
        reject(new Error(`网络请求失败: ${err.errMsg}`));
      },
    });
  });
}

/** 校验是否为有效 URL */
export function isValidUrl(str: string): boolean {
  const regex = /(https?:\/\/)?[a-zA-Z0-9-]+(\.[a-zA-Z0-9.-]+)+\/[\w\-.\/#?%&=:]+/;
  return regex.test(str);
}

/** 从文本中提取第一个 URL */
export function extractUrl(text: string): string {
  const regex = /(https?:\/\/)?[a-zA-Z0-9-]+(\.[a-zA-Z0-9.-]+)+\/[\w\-.\/#?%&=:]+/;
  const matches = text.match(regex);
  return matches ? matches[0].trim() : '';
}
