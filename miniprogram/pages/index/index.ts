// index.ts
// 水印添加工具 + 豆包视频去水印
import { parseVediodbUrl, isValidUrl, extractUrl, VediodbParseResult } from '../../utils/vediodb';

Component({
  data: {
    // 文件信息
    fileInfo: null as any,
    
    // 水印设置
    watermarkText: '这里是水印',
    colorList: ['#CCCCCC', '#000000', '#FF0000', '#FFA500', '#0000FF', '#00FF00'],
    colorIndex: 0,
    watermarkSize: 24,
    
    // 处理后的文件
    processedFileInfo: null as any,
    
    // canvas样式
    canvasStyle: 'position: absolute; left: -9999px; width: 300px; height: 300px;',
    
    // 图片容器高度（默认设置一个合理的固定高度）
    imageContainerHeight: '500px',
    
    // 图片样式
    imageStyle: '',
    
    // 图片放大状态
    isImageZoomed: false,

    // ========== TAB 状态 ==========
    activeTab: 'watermark' as string,  // 'watermark' | 'vediodb'

    // ========== 豆包去水印状态 ==========
    vediodbUrl: '' as string,
    vediodbStatus: '' as string,         // '' | 'loading' | 'success' | 'error'
    vediodbStatusMsg: '' as string,
    vediodbResult: null as VediodbParseResult | null,
    vediodbShowVideo: false as boolean,
  },
  lifetimes: {
    // 组件挂载时执行
    attached() {
      // 动态计算图片容器高度，确保不超过屏幕的2/3
      const that = this;
      wx.getSystemInfo({
        success: function(res) {
          // 计算可用高度
          const safeAreaHeight = res.safeArea.height;
          
          // 设置图片容器高度为安全区域的1/2
          const maxImageHeight = Math.floor(safeAreaHeight * 0.5);
          that.setData({
            imageContainerHeight: `${maxImageHeight}px`
          });
          
          console.log('屏幕信息:', res);
          console.log('计算的图片容器最大高度:', maxImageHeight, 'px');
        }
      });
    }
  },
  
  methods: {
    // 上传文件
    uploadFile() {
      const that = this;
      wx.showActionSheet({
        itemList: ['从相册选择图片', '从聊天会话选择文件'],
        success: function(res) {
          if (res.tapIndex === 0) {
            // 从相册选择图片
            that.chooseImageFromAlbum()
          } else if (res.tapIndex === 1) {
            // 从聊天会话选择文件
            that.chooseFileFromMessage()
          }
        },
        fail: function(err) {
          console.error('选择上传方式失败:', err)
        }
      })
    },
    
    // 从相册选择图片
    chooseImageFromAlbum() {
      const that = this;
      wx.chooseImage({
        count: 1,
        sizeType: ['original', 'compressed'],
        sourceType: ['album', 'camera'],
        success: function(res) {
          console.log('wx.chooseImage成功:', res)
          const tempFilePath = res.tempFilePaths[0]
          const fileName = tempFilePath.substring(tempFilePath.lastIndexOf('/') + 1)
          
          // 设置fileInfo，然后自动添加水印
          that.setData({
            fileInfo: {
              path: tempFilePath,
              name: fileName,
              size: 0,
              type: 'image'
            },
            processedFileInfo: null
          })
          
          // 先进行内容安全检测，通过后再添加水印
          that.checkImageSecurity(tempFilePath)
        },
        fail: function(err) {
          console.error('上传失败:', err)
          wx.showToast({
            title: '上传失败',
            icon: 'none'
          })
        }
      })
    },

    // 从聊天会话选择文件
    chooseFileFromMessage() {
      const that = this;
      wx.chooseMessageFile({
        count: 1,
        type: 'file',
        extension: ['jpg', 'jpeg', 'png'],
        success: function(res) {
          console.log('wx.chooseMessageFile成功:', res)
          const tempFile = res.tempFiles[0]
          const fileType = tempFile.name.match(/\.(jpg|jpeg|png)$/i) ? 'image' : 'pdf'

          // 设置fileInfo，然后自动添加水印
          that.setData({
            fileInfo: {
              path: tempFile.path,
              name: tempFile.name,
              size: tempFile.size,
              type: fileType
            },
            processedFileInfo: null
          })

          // 先进行内容安全检测，通过后再添加水印
          that.checkImageSecurity(tempFile.path)
        },
        fail: function(err) {
          console.error('上传失败:', err)
          wx.showToast({
            title: '上传失败',
            icon: 'none'
          })
        }
      })
    },
    
    // 水印文字变化
    onWatermarkTextChange(e: any) {
      this.setData({
        watermarkText: e.detail.value
      })
    },
    
    // 颜色选择变化
    onColorChange(e: any) {
      this.setData({
        colorIndex: e.currentTarget.dataset.index
      })
    },
    
    // 减小字体大小
    decreaseFontSize() {
      if (this.data.watermarkSize > 12) {
        this.setData({
          watermarkSize: this.data.watermarkSize - 2
        })
      }
    },
    
    // 增大字体大小
    increaseFontSize() {
      if (this.data.watermarkSize < 72) {
        this.setData({
          watermarkSize: this.data.watermarkSize + 2
        })
      }
    },
    
    // 添加水印（平铺效果）
    addWatermark() {
      console.log('addWatermark方法被调用')
      console.log('当前fileInfo:', this.data.fileInfo)
      console.log('当前watermarkText:', this.data.watermarkText)
      
      if (!this.data.fileInfo) {
        console.error('fileInfo为空，无法添加水印')
        wx.showToast({
          title: '请先上传文件',
          icon: 'none'
        })
        return
      }
      
      if (!this.data.watermarkText) {
        console.error('watermarkText为空，无法添加水印')
        wx.showToast({
          title: '请输入水印文字',
          icon: 'none'
        })
        return
      }
      
      console.log('文件类型:', this.data.fileInfo.type)
      
      if (this.data.fileInfo.type === 'image') {
        console.log('开始为图片添加水印')
        this.addTiledWatermark()
      } else {
        console.error('不支持的文件类型:', this.data.fileInfo.type)
        wx.hideLoading()
        wx.showModal({
          title: '提示',
          content: 'PDF水印功能需要云开发支持，当前版本暂不支持。',
          showCancel: false
        })
      }
    },
    
    // 图片内容安全检测
    // 图片内容安全检测
    // 压缩 → 上传云存储 → 拿临时 URL → Flask 下载后调微信 imgSecCheck
    // 检测通过 → 继续水印；违规 → 阻断；其他错误 → 容错放行
    checkImageSecurity(imagePath: string) {
      var that = this;
      wx.showLoading({ title: '安全检测中...' });

      // 先压缩图片，减小体积
      wx.compressImage({
        src: imagePath,
        quality: 40,
        success: function (compressRes) {
          // 上传压缩图到云存储
          var cloudPath = 'sec-check/' + Date.now() + '.jpg';
          wx.cloud.uploadFile({
            cloudPath: cloudPath,
            filePath: compressRes.tempFilePath,
            success: function (uploadRes) {
              // 获取临时下载链接（有效期 2 小时，Flask 用此链接下载）
              wx.cloud.getTempFileURL({
                fileList: [uploadRes.fileID],
                success: function (urlRes) {
                  var tempUrl = urlRes.fileList[0].tempFileURL;
                  // 将临时 URL 传给 Flask 后端
                  wx.cloud.callContainer({
                    config: { env: 'prod-d5gom78c0baa72fbe' },
                    path: '/api/imgSecCheck',
                    header: { 'X-WX-SERVICE': 'flask-dyg3' },
                    method: 'POST',
                    data: { imgUrl: tempUrl },
                    success: function (ccRes) {
                      wx.hideLoading();
                      // Flask 已下载完毕，可以安全删除云存储文件
                      wx.cloud.deleteFile({ fileList: [uploadRes.fileID] });
                      var result: any = ccRes.data;
                      if (result && result.errcode === 87014) {
                        console.warn('内容安全检测不通过，阻断图片处理');
                        that.showSecurityBlockModal();
                      } else {
                        if (result && result.errcode !== 0) {
                          console.warn('内容安全检测异常，容错放行:', result);
                        } else {
                          console.log('内容安全检测通过');
                        }
                        that.addWatermark();
                      }
                    },
                    fail: function (err) {
                      wx.hideLoading();
                      // 请求失败也清理文件
                      wx.cloud.deleteFile({ fileList: [uploadRes.fileID] });
                      console.error('云托管调用失败，容错放行:', err);
                      that.addWatermark();
                    }
                  });
                },
                fail: function (err) {
                  wx.hideLoading();
                  console.error('获取临时链接失败，容错放行:', err);
                  that.addWatermark();
                }
              });
            },
            fail: function (err) {
              wx.hideLoading();
              console.error('上传云存储失败，容错放行:', err);
              that.addWatermark();
            }
          });
        },
        fail: function (err) {
          wx.hideLoading();
          console.error('压缩图片失败，容错放行:', err);
          that.addWatermark();
        }
      });
    },

    // 内容安全检测不通过的阻断弹窗
    showSecurityBlockModal() {
      // 清除 fileInfo 以重置界面状态
      this.setData({
        fileInfo: null,
        processedFileInfo: null
      });
      wx.showModal({
        title: '提示',
        content: '图片内容含违规信息，无法处理',
        showCancel: false,
        confirmText: '我知道了'
      });
    },

    // 为图片添加平铺水印
    addTiledWatermark() {
      const { fileInfo, watermarkText, colorList, colorIndex, watermarkSize } = this.data
      const that = this
      
      // 显示加载状态
      wx.showLoading({
        title: '正在添加水印...',
      })
      
      // 设置超时处理，防止长时间卡在此步骤
      const timeoutId = setTimeout(() => {
        console.error('水印添加超时');
        wx.hideLoading()
        wx.showToast({
          title: '水印添加超时',
          icon: 'none'
        })
      }, 30000) // 30秒超时，处理大图片需要更长时间
      
      // 使用Promise封装异步操作，减少嵌套层级
      const getImageInfo = () => {
        return new Promise((resolve, reject) => {
          wx.getImageInfo({
            src: fileInfo.path,
            success: resolve,
            fail: reject
          })
        })
      }
      
      // 执行异步操作
      getImageInfo()
        .then((res: any) => {
          console.log('获取图片信息成功:', res);
          // 设置canvas大小，但保持canvas隐藏
          const canvasWidth = res.width
          const canvasHeight = res.height
          
          console.log('图片信息:', res)
          console.log('计算的canvas尺寸:', canvasWidth, 'x', canvasHeight)
          
          // 设置canvas样式
          return new Promise<any>((resolve) => {
            that.setData({
              canvasStyle: `position: absolute; left: -9999px; width: ${canvasWidth}px; height: ${canvasHeight}px;`
            }, () => resolve({ res, canvasWidth, canvasHeight }))
          })
        })
        .then(({ res, canvasWidth, canvasHeight }: any) => {
          // 等待canvas渲染完成
          return new Promise<any>((resolve) => {
            setTimeout(() => resolve({ res, canvasWidth, canvasHeight }), 100)
          })
        })
        .then(({ res, canvasWidth, canvasHeight }: any) => {
          // 使用传统canvas API绘制
          console.log('=== Canvas绘制调试 ===');
          console.log('canvas尺寸:', canvasWidth, 'x', canvasHeight);
          console.log('水印文字:', watermarkText);
          console.log('水印颜色:', colorList[colorIndex]);
          console.log('水印大小:', watermarkSize);
          console.log('原始图片路径:', res.path);
          console.log('drawImage参数:', res.path, 0, 0, canvasWidth, canvasHeight);
          
          const ctx = wx.createCanvasContext('watermarkCanvas')
          
          // 清空canvas
          ctx.clearRect(0, 0, canvasWidth, canvasHeight);
          
          // 绘制原始图片
          ctx.drawImage(res.path, 0, 0, canvasWidth, canvasHeight);
          
          // 添加水印文字
          ctx.setFontSize(watermarkSize)
          ctx.setFillStyle(colorList[colorIndex])
          ctx.setGlobalAlpha(0.5)
          const rotateAngle = -Math.PI / 6; // 30度
          const spacing = 150; // 水印间距
          
          // 计算文字宽度的一种方法，确保textWidth是有效的数字
          let textWidth: number
          try {
            if (ctx.measureText && typeof ctx.measureText === 'function') {
              const textMetrics = ctx.measureText(watermarkText)
              textWidth = typeof textMetrics.width === 'number' ? textMetrics.width : watermarkText.length * watermarkSize * 0.55
            } else {
              textWidth = watermarkText.length * watermarkSize * 0.55
            }
            // 确保textWidth是有效的数字
            if (isNaN(textWidth) || !isFinite(textWidth)) {
              textWidth = watermarkText.length * watermarkSize * 0.55
            }
          } catch (e) {
            console.error('计算文字宽度出错:', e)
            textWidth = watermarkText.length * watermarkSize * 0.55
          }
          console.log('文字宽度:', textWidth);
          
          // 平铺水印
          try {
            for (let x = -spacing; x < canvasWidth + spacing; x += spacing) {
              for (let y = -spacing; y < canvasHeight + spacing; y += spacing) {
                ctx.save();
                ctx.translate(x, y);
                ctx.rotate(rotateAngle);
                ctx.fillText(watermarkText, -textWidth / 2, 0);
                ctx.restore();
              }
            }
            console.log('水印绘制完成');
          } catch (e) {
            console.error('绘制水印出错:', e)
            // 如果绘制出错，我们仍然尝试继续流程
          }
          
          // 绘制完成后返回Promise，添加错误处理
          return new Promise<any>((resolve, reject) => {
            try {
              ctx.draw(true, () => {
                console.log('处理Canvas绘制完成，准备开始绘制预览Canvas');
                resolve({ res, canvasWidth, canvasHeight })
              })
              
              // 额外的超时保护
              setTimeout(() => {
                reject(new Error('Canvas绘制超时'))
              }, 5000)
            } catch (e) {
              reject(new Error(`Canvas绘制出错: ${e}`))
            }
          })
        })
        .then(({ canvasWidth, canvasHeight }) => {
          // 为了兼容性，我们先将处理后的canvas转换为临时文件
          return new Promise<any>((resolve, reject) => {
            try {
              wx.canvasToTempFilePath({
                canvasId: 'watermarkCanvas',
                x: 0,
                y: 0,
                width: canvasWidth,
                height: canvasHeight,
                fileType: 'png',
                quality: 0.8,
                success: (tempRes) => {
                  console.log('临时文件生成成功:', tempRes)
                  resolve({ canvasWidth, canvasHeight, tempFilePath: tempRes.tempFilePath })
                },
                fail: (err) => {
                  console.error('生成临时文件失败:', err)
                  reject(new Error('生成临时文件失败: ' + JSON.stringify(err)))
                }
              })
            } catch (e) {
              reject(new Error(`生成临时文件出错: ${e}`))
            }
          })
        })
        .then(({ canvasWidth, canvasHeight, tempFilePath }) => {
          console.log('canvas转换成功:', { tempFilePath, canvasWidth, canvasHeight });
          
          // 保存临时文件路径，用于预览
          // 隐藏绘制用的canvas
          that.setData({
            canvasStyle: 'position: absolute; left: -9999px; width: 300px; height: 300px;'
          }, () => {
            console.log('绘制canvas已隐藏');
            
            // 延迟一下，确保canvas隐藏完成后再设置processedFileInfo
            setTimeout(() => {
              console.log('准备设置processedFileInfo');
              console.log('临时文件路径:', tempFilePath);
              
              // 设置processedFileInfo，触发预览显示，包含原始图片宽高
              that.setData({
                processedFileInfo: {
                  path: tempFilePath,
                  name: `watermarked_${fileInfo.name}`,
                  type: 'image',
                  width: canvasWidth,  // 保存原始图片宽度
                  height: canvasHeight  // 保存原始图片高度
                }
              }, () => {
                console.log('=== 图片预览状态调试 ===');
                console.log('processedFileInfo:', that.data.processedFileInfo);
                console.log('processedFileInfo路径:', that.data.processedFileInfo.path);
                console.log('processedFileInfo类型:', that.data.processedFileInfo.type);
                console.log('processedFileInfo宽高:', that.data.processedFileInfo.width, 'x', that.data.processedFileInfo.height);
                console.log('图片预览是否应该显示:', !!that.data.processedFileInfo);
                

                
                // 清除超时
                clearTimeout(timeoutId)
                
                wx.hideLoading()
                wx.showToast({
                  title: '水印添加成功',
                  icon: 'success'
                })
              })
            }, 100);
          })
        })
        .catch((err) => {
          console.error('水印添加失败:', err)
          console.error('错误上下文信息:', {
            fileInfo: fileInfo,
            watermarkText: watermarkText,
            canvasStyle: that.data.canvasStyle,
            errorStack: err.stack || '无堆栈信息'
          })
          
          // 清除超时
          clearTimeout(timeoutId)
          
          // 失败时也要隐藏canvas
          that.setData({
            canvasStyle: 'position: absolute; left: -9999px; width: 300px; height: 300px;'
          })
          
          wx.hideLoading()
          wx.showToast({
            title: '水印添加失败',
            icon: 'none'
          })
        })
    },
  
    // 预览水印效果
    previewWatermark() {
      // 检查是否有有效的文件信息
      if (!this.data.fileInfo && !this.data.processedFileInfo) {
        wx.showToast({
          title: '请先上传文件',
          icon: 'none'
        })
        return
      }
      
      if (!this.data.watermarkText) {
        wx.showToast({
          title: '请输入水印文字',
          icon: 'none'
        })
        return
      }
      
      wx.showLoading({
        title: '正在生成预览...',
      })
      
      // 确保使用原始文件来重新生成水印
      // 如果只有processedFileInfo（说明原始fileInfo已被意外清空），则使用它
      let originalFileInfo = this.data.fileInfo;
      if (!originalFileInfo && this.data.processedFileInfo) {
        originalFileInfo = this.data.processedFileInfo;
      }
      
      if (!originalFileInfo) {
        wx.hideLoading();
        wx.showToast({
          title: '文件信息丢失',
          icon: 'none'
        });
        return;
      }
      
      // 重新生成水印预览 - 确保addWatermark有正确的fileInfo
      this.setData({
        fileInfo: originalFileInfo, // 确保addWatermark有正确的fileInfo
        processedFileInfo: null // 清空processedFileInfo，显示处理中状态
      }, () => {
        // 调用addWatermark重新生成水印
        this.addWatermark()
      })
    },
    
    // 图片加载成功处理
    onImageLoadSuccess(e: any) {
      console.log('=== 图片加载成功调试 ===');
      console.log('图片加载成功:', e);
      console.log('图片尺寸:', e.detail.width, 'x', e.detail.height);
      console.log('当前图片路径:', this.data.processedFileInfo && this.data.processedFileInfo.path);
      console.log('图片路径格式:', this.data.processedFileInfo && this.data.processedFileInfo.path.startsWith('wxfile://'));
      
      // 保存图片实际宽高到processedFileInfo
      if (this.data.processedFileInfo) {
        this.setData({
          'processedFileInfo.width': e.detail.width,
          'processedFileInfo.height': e.detail.height
        });
        console.log('图片宽高已保存到processedFileInfo');
      }
      
      // 获取图片元素信息
      const query = wx.createSelectorQuery();
      query.select('.preview-img').boundingClientRect();
      query.select('.image-preview-container').boundingClientRect();
      query.exec((res: any) => {
        if (res) {
          console.log('图片元素信息:', res[0]);
          console.log('容器元素信息:', res[1]);
          
          // 获取系统信息
          wx.getSystemInfo({
            success: (sysRes: any) => {
              // 计算合理的默认宽度（屏幕宽度减去padding）
              const defaultWidth = sysRes.windowWidth - 100; // 减去容器的padding
              
              // 无论图片高度是否为0，都手动计算并设置图片尺寸
              console.log('手动设置图片尺寸');
              const imgWidth = e.detail.width;
              const imgHeight = e.detail.height;
              
              // 获取容器宽度，如果容器宽度为0则使用默认宽度
              let containerWidth = res[1] && res[1].width > 0 ? res[1].width : defaultWidth;
              // 获取容器高度，如果容器高度为0则使用图片容器的最大高度
              let containerHeight = res[1] && res[1].height > 0 ? res[1].height : parseInt(this.data.imageContainerHeight);
              
              console.log('容器宽度:', containerWidth, '容器高度:', containerHeight);
              
              // 计算合适的图片尺寸，保持宽高比
              let targetWidth = containerWidth;
              let targetHeight = (imgHeight / imgWidth) * targetWidth;
              
              // 确保不超过容器高度
              if (targetHeight > containerHeight) {
                targetHeight = containerHeight;
                targetWidth = (imgWidth / imgHeight) * targetHeight;
              }
              
              // 确保图片宽度至少有200px
              if (targetWidth < 200) {
                targetWidth = 200;
                targetHeight = (imgHeight / imgWidth) * targetWidth;
              }
              
              // 确保图片不超过屏幕宽度
              const maxScreenWidth = sysRes.windowWidth - 60; // 减去页面padding
              if (targetWidth > maxScreenWidth) {
                targetWidth = maxScreenWidth;
                targetHeight = (imgHeight / imgWidth) * targetWidth;
              }
              
              console.log('计算的图片尺寸:', targetWidth, 'x', targetHeight);
              
              // 在小程序中，使用setData更新样式
              this.setData({
                imageStyle: `width: ${targetWidth}px; height: ${targetHeight}px;`
              });
              console.log('已手动设置图片尺寸:', this.data.imageStyle);
            }
          });
        }
      });
    },
    
    // 图片加载错误处理
    onImageLoadError(e: any) {
      console.error('=== 图片加载错误调试 ===');
      console.error('图片加载错误:', e);
      console.error('错误信息:', e.detail.errMsg);
      console.error('当前图片路径:', this.data.processedFileInfo && this.data.processedFileInfo.path);
      console.error('图片路径格式:', this.data.processedFileInfo && this.data.processedFileInfo.path.startsWith('wxfile://'));
      
      // 获取图片元素信息
      const query = wx.createSelectorQuery();
      query.select('.preview-img').boundingClientRect();
      query.select('.image-preview-container').boundingClientRect();
      query.exec(function(res) {
        if (res) {
          console.error('错误时图片元素信息:', res[0]);
          console.error('错误时容器元素信息:', res[1]);
        }
      });
        
      wx.showToast({
        title: '图片加载失败',
        icon: 'none'
      });
    },
    
    // 图片点击事件（放大/缩小）
    onImageTap() {
      console.log('图片被点击，当前放大状态:', this.data.isImageZoomed);
      
      const isZoomed = this.data.isImageZoomed;
      
      // 切换放大状态
      this.setData({
        isImageZoomed: !isZoomed
      });
      
      // 如果是放大状态
      if (!isZoomed) {
        // 获取系统信息，计算全屏尺寸
        wx.getSystemInfo({
          success: (res) => {
            console.log('放大图片，系统信息:', res);
            
            // 放大时覆盖全屏
            this.setData({
              imageStyle: `
                position: fixed;
                top: 0;
                left: 0;
                width: ${res.windowWidth}px;
                height: ${res.windowHeight}px;
                max-width: none;
                max-height: none;
                z-index: 9999;
                background-color: #000;
              `
            });
          }
        });
      } else {
        // 缩小恢复原尺寸，重新计算原始样式
        console.log('缩小图片，恢复原尺寸');
        
        // 重新调用图片加载成功的处理函数，恢复原始样式
        if (this.data.processedFileInfo) {
          // 创建一个模拟的图片加载成功事件
          const mockEvent = {
            detail: {
              width: this.data.processedFileInfo.width || 0,
              height: this.data.processedFileInfo.height || 0
            }
          };
          
          // 调用图片加载成功的处理函数重新计算样式
          this.onImageLoadSuccess(mockEvent);
        }
      }
    },
    
    // 保存文件到相册
    saveFile() {
      if (!this.data.processedFileInfo) {
        wx.showToast({
          title: '没有可保存的文件',
          icon: 'none'
        })
        return
      }
      
      wx.showLoading({
        title: '正在保存...',
      })
      
      const imagePath = this.data.processedFileInfo.path;
      
      // 保存图片到相册
      wx.saveImageToPhotosAlbum({
        filePath: imagePath,
        success: function() {
          wx.hideLoading()
          wx.showToast({
            title: '保存成功',
            icon: 'success'
          })
          
          wx.showModal({
            title: '保存成功',
            content: '图片已保存到相册',
            showCancel: false
          })
        },
        fail: function(err) {
          console.error('保存失败:', err)
          wx.hideLoading()
          
          // 如果是用户拒绝授权，引导用户打开权限设置
          if (err.errMsg.indexOf('auth deny') > -1 || err.errMsg.indexOf('auth deny') > -1) {
            wx.showModal({
              title: '保存失败',
              content: '需要您授权保存图片到相册',
              confirmText: '去授权',
              success: (res) => {
                if (res.confirm) {
                  // 打开设置页面
                  wx.openSetting({
                    success: (settingRes) => {
                      console.log('设置页面结果:', settingRes)
                    }
                  })
                }
              }
            })
          } else {
            // 其他保存失败的情况
            wx.showToast({
              title: '保存失败',
              icon: 'none'
            })
          }
        }
      })
    },
    
    // 分享图片到微信会话
    shareImage() {
      if (!this.data.processedFileInfo) {
        wx.showToast({
          title: '没有可分享的文件',
          icon: 'none'
        })
        return
      }
      
      wx.showLoading({
        title: '正在准备分享...',
      })
      
      const imagePath = this.data.processedFileInfo.path;
      
      // 使用微信小程序的分享图片API
      wx.showShareImageMenu({
        path: imagePath,
        success: function() {
          console.log('分享成功')
          wx.hideLoading()
        },
        fail: function(err) {
          console.error('分享失败:', err)
          wx.hideLoading()
          wx.showToast({
            title: '分享失败',
            icon: 'none'
          })
        }
      })
    },
    
    // 删除图片
    deleteImage() {
      // 清除相关数据
      this.setData({
        fileInfo: null,
        processedFileInfo: null,
        imageStyle: '',
        isImageZoomed: false
      })

      // 给用户一个删除成功的提示
      wx.showToast({
        title: '图片已删除',
        icon: 'success',
        duration: 1500
      })
    },

    // ========== TAB 切换 ==========
    switchTab(e: any) {
      const tab = e.currentTarget.dataset.tab;
      if (tab === this.data.activeTab) return;
      this.setData({
        activeTab: tab,
      });
    },

    // ========== 豆包视频去水印 ==========

    // 输入框内容变化
    onVediodbUrlInput(e: any) {
      this.setData({
        vediodbUrl: e.detail.value,
      });
    },

    // 从剪贴板粘贴
    pasteFromClipboard() {
      wx.getClipboardData({
        success: (res) => {
          if (res.data && res.data.trim()) {
            this.setData({ vediodbUrl: res.data.trim() });
            wx.showToast({ title: '已粘贴', icon: 'success', duration: 1000 });
          } else {
            wx.showToast({ title: '剪贴板为空', icon: 'none' });
          }
        },
        fail: () => {
          wx.showToast({ title: '无法读取剪贴板，请手动粘贴', icon: 'none' });
        },
      });
    },

    // 清空输入和结果
    clearVediodbInput() {
      this.setData({
        vediodbUrl: '',
        vediodbStatus: '',
        vediodbStatusMsg: '',
        vediodbResult: null,
        vediodbShowVideo: false,
      });
    },

    // 解析豆包视频链接
    parseVediodbVideo() {
      const input = this.data.vediodbUrl.trim();
      if (!input) {
        this.setData({
          vediodbStatus: 'error',
          vediodbStatusMsg: '请输入视频链接',
        });
        return;
      }

      if (!isValidUrl(input)) {
        this.setData({
          vediodbStatus: 'error',
          vediodbStatusMsg: '链接格式不正确，请检查',
        });
        return;
      }

      const url = extractUrl(input);

      this.setData({
        vediodbStatus: 'loading',
        vediodbStatusMsg: '正在解析视频链接...',
        vediodbShowVideo: false,
        vediodbResult: null,
      });

      wx.showLoading({ title: '解析中...' });

      parseVediodbUrl(url)
        .then((data) => {
          wx.hideLoading();
          if (data.code === 0 || data.code === 1) {
            this.setData({
              vediodbResult: data,
              vediodbStatus: 'success',
              vediodbStatusMsg: '解析成功！无水印视频已就绪',
              vediodbShowVideo: true,
            });
          } else {
            this.setData({
              vediodbStatus: 'error',
              vediodbStatusMsg: data.msg || '解析失败，请检查链接是否正确',
            });
          }
        })
        .catch((err) => {
          wx.hideLoading();
          console.error('豆包解析失败:', err);
          this.setData({
            vediodbStatus: 'error',
            vediodbStatusMsg: '解析失败: ' + (err.message || '网络错误，请稍后重试'),
          });
        });
    },

    // 保存视频到相册
    saveVediodbVideo() {
      const result = this.data.vediodbResult;
      if (!result) return;

      const videoInfo = result.body && result.body.video_info ? result.body.video_info : null;
      const urls: string[] = [];
      if (videoInfo) {
        if (videoInfo.url_bk) urls.push(videoInfo.url_bk);
        if (videoInfo.url_dl) urls.push(videoInfo.url_dl);
        if (videoInfo.url) urls.push(videoInfo.url);
      }
      if (urls.length === 0) {
        wx.showToast({ title: '没有可下载的视频链接', icon: 'none' });
        return;
      }

      // 逐个尝试下载链接，直到成功
      const tryDownload = (index: number) => {
        if (index >= urls.length) {
          wx.hideLoading();
          wx.showToast({ title: '所有链接均下载失败', icon: 'none' });
          return;
        }

        wx.showLoading({ title: `正在下载视频(${index + 1}/${urls.length})...` });

        wx.downloadFile({
          url: urls[index],
          timeout: 120000,
          success: (res) => {
            if (res.statusCode === 200 && res.tempFilePath) {
              wx.saveVideoToPhotosAlbum({
                filePath: res.tempFilePath,
                success: () => {
                  wx.hideLoading();
                  wx.showToast({ title: '视频已保存到相册', icon: 'success' });
                },
                fail: (err) => {
                  wx.hideLoading();
                  console.error('保存视频失败:', err);
                  if (err.errMsg.indexOf('auth deny') > -1) {
                    wx.showModal({
                      title: '需要授权',
                      content: '请授权保存视频到相册',
                      confirmText: '去授权',
                      success: (modalRes) => {
                        if (modalRes.confirm) {
                          wx.openSetting({});
                        }
                      },
                    });
                  } else {
                    // 尝试下一个链接
                    console.warn('保存失败，尝试备用链接:', err.errMsg);
                    tryDownload(index + 1);
                  }
                },
              });
            } else {
              console.warn('下载返回异常:', res.statusCode);
              tryDownload(index + 1);
            }
          },
          fail: (err) => {
            console.error('下载失败:', err);
            tryDownload(index + 1);
          },
        });
      };

      tryDownload(0);
    },

    // 保存图片到相册
    saveVediodbImage(e: any) {
      const imageUrl = e.currentTarget.dataset.url;
      if (!imageUrl) {
        wx.showToast({ title: '没有可下载的图片', icon: 'none' });
        return;
      }

      wx.showLoading({ title: '正在下载图片...' });

      wx.downloadFile({
        url: imageUrl,
        timeout: 60000,
        success: (res) => {
          if (res.statusCode === 200) {
            wx.saveImageToPhotosAlbum({
              filePath: res.tempFilePath,
              success: () => {
                wx.hideLoading();
                wx.showToast({ title: '图片已保存到相册', icon: 'success' });
              },
              fail: (err) => {
                wx.hideLoading();
                console.error('保存图片失败:', err);
                if (err.errMsg.indexOf('auth deny') > -1) {
                  wx.showModal({
                    title: '需要授权',
                    content: '请授权保存图片到相册',
                    confirmText: '去授权',
                    success: (modalRes) => {
                      if (modalRes.confirm) {
                        wx.openSetting({});
                      }
                    },
                  });
                } else {
                  wx.showToast({ title: '保存失败', icon: 'none' });
                }
              },
            });
          } else {
            wx.hideLoading();
            wx.showToast({ title: '下载失败', icon: 'none' });
          }
        },
        fail: (err) => {
          wx.hideLoading();
          console.error('下载图片失败:', err);
          wx.showToast({ title: '下载失败，请稍后重试', icon: 'none' });
        },
      });
    },

    // 复制链接
    copyVediodbLink(e: any) {
      const linkUrl = e.currentTarget.dataset.url;
      if (!linkUrl) {
        wx.showToast({ title: '没有可复制的链接', icon: 'none' });
        return;
      }

      wx.setClipboardData({
        data: linkUrl,
        success: () => {
          wx.showToast({ title: '链接已复制', icon: 'success' });
        },
        fail: () => {
          wx.showToast({ title: '复制失败', icon: 'none' });
        },
      });
    },

    // 复制文案
    copyVediodbText(e: any) {
      const text = e.currentTarget.dataset.text;
      if (!text) {
        wx.showToast({ title: '没有可复制的文案', icon: 'none' });
        return;
      }

      wx.setClipboardData({
        data: text,
        success: () => {
          wx.showToast({ title: '文案已复制', icon: 'success' });
        },
        fail: () => {
          wx.showToast({ title: '复制失败', icon: 'none' });
        },
      });
    },
  },
})
