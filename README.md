# Venera 漫画源（HJ）

这是一个按 [Venera 漫画源规范](https://github.com/venera-app/venera/blob/master/doc/comic_source.md) 整理的漫画源项目。

## 在 Venera 中添加

在漫画源列表中填写下面的 JSON 地址：

```text
https://raw.githubusercontent.com/Taototo/venera-comic-sources/main/index.json
```

也可以使用 jsDelivr 镜像：

```text
https://cdn.jsdelivr.net/gh/Taototo/venera-comic-sources@main/index.json
```

## 目录说明

- `index.json`：Venera 漫画源清单。
- `sources/`：可被 Venera 直接加载的 JavaScript 源文件。
- `legacy/hj.json`：原始 Legado 漫画源集合，仅作为迁移输入保存，不能直接作为 Venera 源加载。

当前已迁移 4 个条目：包子漫画、18 漫画、紳士漫畫和漫画 1234。原始文件中的其他条目仍保留在 `legacy/hj.json`，因为它们使用旧版 Legado 规则（XPath、`@js`、`@JSon` 等），需要逐站验证后才能转换成 Venera JavaScript；它们没有被伪装成“已可用”的源。

源文件中保留了对 Venera 官方配置的适配说明；每个源的 `url` 已改为本仓库地址，后续可以在 GitHub 上独立更新版本。

## 开发检查

提交前可以用 Node.js 检查 JavaScript 语法：

```text
node --check sources/hj_baozi.js
node --check sources/hj_mh18.js
node --check sources/hj_wnacg.js
node --check sources/hj_mh1234.js
```
