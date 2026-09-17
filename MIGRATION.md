# hj.json 迁移记录

`legacy/hj.json` 是 Legado 的 `bookSource` 数组，不是 Venera 源文件。迁移时只把已经有对应 Venera 实现、且可以明确建立映射的条目放入 `index.json`。

| 原始条目 | Venera 文件 | 状态 |
| --- | --- | --- |
| 包子漫画 | `sources/hj_baozi.js` | 已迁移 |
| 18 真人图集 | `sources/hj_mh18.js` | 已按 `18gallery.com` 图集结构迁移；保留原 key 以便旧安装更新 |
| 紳士漫畫·国内直连 | `sources/hj_wnacg.js` | 已迁移，域名在源设置中填写 |
| 漫画1234 | `sources/hj_mh1234.js` | 已迁移 |
| 其余 15 个条目 | `legacy/hj.json` | 待逐站转换和验证 |
