# Venera 漫画源（官方可用配置 + HJ）

这是一个按 [Venera 漫画源规范](https://github.com/venera-app/venera/blob/master/doc/comic_source.md) 整理的漫画源项目。项目包含从 [venera-configs 官方配置](https://github.com/venera-app/venera-configs) 复制并经过中国大陆网络连通性筛选的官方源，也保留了从 `hj.json` 迁移的自定义 HJ 源。

## 在 Venera 中添加

在漫画源列表中填写下面的 JSON 地址：

```text
https://cdn.jsdelivr.net/gh/Taototo/venera-comic-sources@main/index.json
```

不要填写 `github.com/.../blob/...` 的网页地址。若你的网络无法访问 jsDelivr，再使用 GitHub raw 清单地址。清单会同时加载官方可用源和 HJ 源；也可以逐条添加下面的 jsDelivr 源地址：

```text
https://cdn.jsdelivr.net/gh/Taototo/venera-comic-sources@main/sources/hj_baozi.js
https://cdn.jsdelivr.net/gh/Taototo/venera-comic-sources@main/sources/hj_mh18.js
https://cdn.jsdelivr.net/gh/Taototo/venera-comic-sources@main/sources/hj_wnacg.js
https://cdn.jsdelivr.net/gh/Taototo/venera-comic-sources@main/sources/hj_mh1234.js
```

备用清单地址（GitHub raw）：

```text
https://raw.githubusercontent.com/Taototo/venera-comic-sources/main/index.json
```

## 目录说明

- `index.json`：Venera 漫画源清单。每个条目使用完整 `url`，因此即使误把清单网页地址当成输入，也不会再拼出 `blob/...` 的错误源地址。
- `sources/official/`：从官方 `venera-configs` 复制并按连通性筛选的源文件；更新地址已指向本仓库。
- `sources/`：自定义 HJ 源及官方 JavaScript API 类型提示文件。
- `sources/_venera_.js`：官方 JavaScript API 类型提示文件，仅供编辑器使用。
- `legacy/hj.json`：原始 Legado 漫画源集合，仅作为迁移输入保存，不能直接作为 Venera 源加载。
- `SOURCE_CHECK.md`：官方清单逐源检测入口、状态、搬运和排除原因。

当前清单包含 10 个通过检测的官方源和 4 个自定义 HJ 源。官方源中包子漫画默认切换到可达的 `tw` 站点，漫小肆只保留已测通的域名，GoDa 图片域名按实际章节响应修正；Komga 和 Lanraragi 属于需要账号或自建服务器的服务型源。官方清单中无法稳定访问或接口持续报错的源没有复制，具体结果见 `SOURCE_CHECK.md`。

自定义 HJ 源包括包子漫画、18 真人图集、紳士漫畫和漫画 1234。18 真人图集按 `hj.json` 中的 `18gallery.com` 站点实现，图集分页会转换为 Venera 章节。原始文件中的其他条目仍保留在 `legacy/hj.json`，因为它们使用旧版 Legado 规则（XPath、`@js`、`@JSon` 等），需要逐站验证后才能转换成 Venera JavaScript。

源文件中保留了对 Venera 官方配置的适配说明；每个源的 `url` 已改为本仓库地址，后续可以在 GitHub 上独立更新版本。

## 开发检查

提交前可以用 Node.js 检查 JavaScript 语法：

```text
Get-ChildItem sources -Filter *.js -Recurse | ForEach-Object { node --check $_.FullName }
```
