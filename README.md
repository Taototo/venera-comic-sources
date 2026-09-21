# Venera 漫画源（Ven + 私人）

这是按 [Venera 漫画源规范](https://github.com/venera-app/venera/blob/master/doc/comic_source.md) 整理的源集合。清单只使用“Ven”和“私人”两种显示标识，不再用来源文件的历史名称区分。

## 在 Venera 中添加

在对应页面的源列表中添加清单地址。漫画和视频使用独立清单：

漫画清单：

```text
https://cdn.jsdelivr.net/gh/Taototo/venera-comic-sources@main/comic_index.json
```

视频清单：

```text
https://cdn.jsdelivr.net/gh/Taototo/venera-comic-sources@main/video_index.json
```

无法访问 jsDelivr 时可改用 GitHub Raw：

```text
https://raw.githubusercontent.com/Taototo/venera-comic-sources/main/comic_index.json
https://raw.githubusercontent.com/Taototo/venera-comic-sources/main/video_index.json
```

也可以逐条添加源文件：

```text
https://cdn.jsdelivr.net/gh/Taototo/venera-comic-sources@main/sources/ven/zaimanhua.js
https://cdn.jsdelivr.net/gh/Taototo/venera-comic-sources@main/sources/ven/mxs.js
https://cdn.jsdelivr.net/gh/Taototo/venera-comic-sources@main/sources/ven/manhuaren.js
https://cdn.jsdelivr.net/gh/Taototo/venera-comic-sources@main/sources/ven/jm.js
https://cdn.jsdelivr.net/gh/Taototo/venera-comic-sources@main/sources/ven/copy_manga.js
https://cdn.jsdelivr.net/gh/Taototo/venera-comic-sources@main/sources/private/baozi.js
https://cdn.jsdelivr.net/gh/Taototo/venera-comic-sources@main/sources/private/wnacg.js
https://cdn.jsdelivr.net/gh/Taototo/venera-comic-sources@main/sources/private/myhl.js
https://cdn.jsdelivr.net/gh/Taototo/venera-comic-sources@main/sources/private/drmh3.js
```

视频源逐条地址：

```text
https://cdn.jsdelivr.net/gh/Taototo/venera-comic-sources@main/sources/ven/public_test_video.js
https://cdn.jsdelivr.net/gh/Taototo/venera-comic-sources@main/sources/private/91short_video.js
https://cdn.jsdelivr.net/gh/Taototo/venera-comic-sources@main/sources/private/tianya_video.js
https://cdn.jsdelivr.net/gh/Taototo/venera-comic-sources@main/sources/private/juliang_video.js
https://cdn.jsdelivr.net/gh/Taototo/venera-comic-sources@main/sources/private/360zy_video.js
https://cdn.jsdelivr.net/gh/Taototo/venera-comic-sources@main/sources/private/zuidapi_video.js
https://cdn.jsdelivr.net/gh/Taototo/venera-comic-sources@main/sources/private/hongniu_video.js
https://cdn.jsdelivr.net/gh/Taototo/venera-comic-sources@main/sources/private/maoyan_video.js
https://cdn.jsdelivr.net/gh/Taototo/venera-comic-sources@main/sources/private/xingba111_video.js
https://cdn.jsdelivr.net/gh/Taototo/venera-comic-sources@main/sources/private/hlzy_video.js
https://cdn.jsdelivr.net/gh/Taototo/venera-comic-sources@main/sources/private/heiapi_video.js
https://cdn.jsdelivr.net/gh/Taototo/venera-comic-sources@main/sources/private/jipinvip1_video.js
```

不要填写 GitHub 的 `blob/...` 网页地址；Venera 需要的是清单或 JavaScript 原始地址。

## 目录和分类

- `comic_index.json`：9 个漫画源的清单。
- `video_index.json`：12 个视频源的清单。
- `index.json`：兼容旧版本的混合清单，已同步移除本轮弃用的视频源。
- `sources/ven/`：从 Ven 配置整理并保留的再漫画、漫小肆、漫画人、禁漫天堂和拷贝漫画。
- `sources/private/`：从原始 `hj.json` 转换并保留的包子漫画、紳士漫畫和魅影画廊，以及新增的大人漫画、天涯资源、巨量资源和其他视频源。
- `sources/ven/public_test_video.js`：使用 W3C、Mozilla 和 Mux 公开测试媒体的播放器链路测试源，不依赖第三方影视站点。
- `sources/_venera_.js`：Venera JavaScript API 类型提示文件，仅供编辑器使用。
- `legacy/hj.json`：最初的 Legado 源文件备份，不可直接作为 Venera 清单导入。
- `SOURCE_CHECK.md`：本次网络检测、搬运和排除结果。

私人源中的包子漫画和紳士漫畫保留历史 key，已安装的源可以直接更新；清单中的显示名称已经统一为“（私人）”。

## 检查

```powershell
Get-ChildItem sources -Filter *.js -Recurse | ForEach-Object { node --check $_.FullName }
```
