# Venera 漫画源集合

这是按 [Venera 漫画源规范](https://github.com/venera-app/venera/blob/master/doc/comic_source.md) 整理的源集合。清单按显示名称分为“18+”和“默认”两组；默认组不显示后缀。

## 在 Venera 中添加

漫画清单：

```text
https://cdn.jsdelivr.net/gh/Taototo/venera-comic-sources@main/comic_index.json
```

无法访问 jsDelivr 时可改用 GitHub Raw：

```text
https://raw.githubusercontent.com/Taototo/venera-comic-sources/main/comic_index.json
```

漫画源文件：

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
https://cdn.jsdelivr.net/gh/Taototo/venera-comic-sources@main/sources/private/csmanhua.js
https://cdn.jsdelivr.net/gh/Taototo/venera-comic-sources@main/sources/private/kxmanhua.js
https://cdn.jsdelivr.net/gh/Taototo/venera-comic-sources@main/sources/private/nnhanman.js
https://cdn.jsdelivr.net/gh/Taototo/venera-comic-sources@main/sources/private/jm_uu.js
https://cdn.jsdelivr.net/gh/Taototo/venera-comic-sources@main/sources/private/hmanwu.js
https://cdn.jsdelivr.net/gh/Taototo/venera-comic-sources@main/sources/private/manhuazhan.js
```
不要填写 GitHub 的 `blob/...` 网页地址；Venera 需要的是清单或 JavaScript 原始地址。

## 目录和分类

- `comic_index.json`：15 个漫画源的清单。
- `index.json`：兼容旧版本的漫画源清单。
- 默认组：再漫画、漫画人、拷贝漫画、包子漫画、魅影画廊、漫画站。
- 18+ 组：漫小肆、禁漫天堂、绅士漫画、大人漫画、成色漫画、开心看漫画、鸟鸟韩漫、韩漫屋；网页端禁漫天堂也保留为独立入口。
- `sources/ven/` 和 `sources/private/`：按历史来源存放脚本，分组以清单中的显示名称为准。
- `sources/_venera_.js`：Venera JavaScript API 类型提示文件，仅供编辑器使用。
- `SOURCE_CHECK.md`：本次网络检测、搬运和排除结果。

包子漫画和绅士漫画保留历史 key，已安装的源可以直接更新；显示分组由名称后缀维护。

## 检查

```powershell
Get-ChildItem sources -Filter *.js -Recurse | ForEach-Object { node --check $_.FullName }
```
