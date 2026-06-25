// 调试脚本，用于检查页面元素状态
console.log('=== 调试预览区域 ===');

// 检查 processedFileInfo 状态
const processedFileInfo = getApp().globalData.processedFileInfo || this.data.processedFileInfo;
console.log('processedFileInfo:', processedFileInfo);

// 检查图片路径
if (processedFileInfo && processedFileInfo.path) {
  console.log('图片路径:', processedFileInfo.path);
  console.log('路径格式是否正确:', processedFileInfo.path.startsWith('wxfile://'));
}

// 检查图片容器
const imageContainer = document.querySelector('.image-preview-container');
if (imageContainer) {
  console.log('图片容器存在');
  console.log('容器样式:', getComputedStyle(imageContainer));
  console.log('容器尺寸:', imageContainer.offsetWidth, 'x', imageContainer.offsetHeight);
}

// 检查图片元素
const imageElement = document.querySelector('.preview-img');
if (imageElement) {
  console.log('图片元素存在');
  console.log('图片样式:', getComputedStyle(imageElement));
  console.log('图片尺寸:', imageElement.offsetWidth, 'x', imageElement.offsetHeight);
  console.log('图片 src:', imageElement.src);
}

console.log('=== 调试结束 ===');