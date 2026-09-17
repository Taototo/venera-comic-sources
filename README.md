# Venera 漫画源（Ven + 私人）

这是按 [Venera 漫画源规范](https://github.com/venera-app/venera/blob/master/doc/comic_source.md) 整理的源集合。清单只使用“Ven”和“私人”两种显示标识，不再用来源文件的历史名称区分。

## 在 Venera 中添加

在漫画源列表中添加清单地址：

```text
https://cdn.jsdelivr.net/gh/Taototo/venera-comic-sources@main/index.json
```

无法访问 jsDelivr 时可改用 GitHub Raw：

```text
https://raw.githubusercontent.com/Taototo/venera-comic-sources/main/index.json
```

也可以逐条添加源文件：

```text
https://cdn.jsdelivr.net/gh/Taototo/venera-comic-sources@main/sources/ven/zaimanhua.js
https://cdn.jsdelivr.net/gh/Taototo/venera-comic-sources@main/sources/ven/mxs.js
https://cdn.jsdelivr.net/gh/Taototo/venera-comic-sources@main/sources/ven/manhuaren.js
https://cdn.jsdelivr.net/gh/Taototo/venera-comic-sources@main/sources/private/baozi.js
https://cdn.jsdelivr.net/gh/Taototo/venera-comic-sources@main/sources/private/mh18.js
https://cdn.jsdelivr.net/gh/Taototo/venera-comic-sources@main/sources/private/wnacg.js
https://cdn.jsdelivr.net/gh/Taototo/venera-comic-sources@main/sources/private/mh250.js
https://cdn.jsdelivr.net/gh/Taototo/venera-comic-sources@main/sources/private/myhl.js
https://cdn.jsdelivr.net/gh/Taototo/venera-comic-sources@main/sources/private/waimanhua.js
https://cdn.jsdelivr.net/gh/Taototo/venera-comic-sources@main/sources/private/ssmhw.js
```

不要填写 GitHub 的 `blob/...` 网页地址；Venera 需要的是清单或 JavaScript 原始地址。

## 目录和分类

- `index.json`：10 个可加载源的清单，包含 3 个 Ven 源和 7 个私人源。
- `sources/ven/`：从 Ven 配置整理并保留的再漫画、漫小肆、漫画人。
- `sources/private/`：从原始 `hj.json` 转换的私人源，以及本次新增的可用源。
- `sources/_venera_.js`：Venera JavaScript API 类型提示文件，仅供编辑器使用。
- `legacy/hj.json`：最初的 Legado 源文件备份，不可直接作为 Venera 清单导入。
- `SOURCE_CHECK.md`：本次网络检测、搬运和排除结果。

私人源中的包子、18真人图集和紳士漫畫保留历史 key，已安装的源可以直接更新；清单中的显示名称已经统一为“（私人）”。

## 已按请求移除

GoDa 漫画、comick、拷贝漫画、漫画1234、Lanraragi、Komga 和 Ven 版包子不在当前清单中；私人版漫画1234也已移除。

## 检查

```powershell
Get-ChildItem sources -Filter *.js -Recurse | ForEach-Object { node --check $_.FullName }
```
