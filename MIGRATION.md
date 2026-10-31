# 源清单维护说明

仓库只发布 `index.json` 和 `comic_index.json` 中列出的漫画源文件。漫画源按显示名称分为“18+”和“默认”两组，默认组不显示后缀。

## 当前发布文件

| 分组 | 文件 |
| --- | --- |
| 默认 | `sources/ven/zaimanhua.js`、`sources/ven/manhuaren.js`、`sources/ven/copy_manga.js`、`sources/private/baozi.js`、`sources/private/myhl.js` |
| 18+ | `sources/ven/mxs.js`、`sources/ven/jm.js`、`sources/private/wnacg.js`、`sources/private/drmh3.js`、`sources/private/csmanhua.js`、`sources/private/kxmanhua.js`、`sources/private/nnhanman.js`、`sources/private/jm_uu.js`、`sources/private/hmanwu.js` |

源文件调整后需要同步更新对应清单的 `version`，并用 `node --check` 检查 JavaScript 语法。
