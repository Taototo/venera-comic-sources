# 源清单维护说明

仓库只发布 `index.json`、`comic_index.json` 和 `video_index.json` 中列出的源文件。漫画源分为“Ven”和“私人”两类，视频源维护 HLZY、91短视频、黄果漫剧和 51 吃瓜入口。

## 当前发布文件

| 类型 | 文件 |
| --- | --- |
| Ven 漫画 | `sources/ven/zaimanhua.js`、`sources/ven/mxs.js`、`sources/ven/manhuaren.js`、`sources/ven/jm.js`、`sources/ven/copy_manga.js` |
| 私人漫画 | `sources/private/baozi.js`、`sources/private/wnacg.js`、`sources/private/myhl.js`、`sources/private/drmh3.js` |
| 私人视频 | `sources/private/hlzy_video.js`、`sources/private/short91_video.js`、`sources/private/hguotv_video.js`、`sources/private/vfvyqtmj_video.js` |

源文件调整后需要同步更新对应清单的 `version`，并用 `node --check` 检查 JavaScript 语法。
