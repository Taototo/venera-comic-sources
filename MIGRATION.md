# hj.json 迁移记录

`legacy/hj.json` 是 Legado 的 `bookSource` 数组，不是 Venera 源文件。迁移时只把已经有对应 Venera 实现、且可以明确建立映射的条目放入 `index.json`。

| 原始条目 | Venera 文件 | 状态 |
| --- | --- | --- |
| 包子漫画 | `sources/hj_baozi.js` | 已迁移 |
| 18 真人图集 | `sources/hj_mh18.js` | 已按 `18gallery.com` 图集结构迁移；保留原 key 以便旧安装更新 |
| 紳士漫畫·国内直连 | `sources/hj_wnacg.js` | 已迁移，域名在源设置中填写 |
| 漫画1234 | `sources/hj_mh1234.js` | 已迁移 |
| 其余 15 个条目 | `legacy/hj.json` | 待逐站转换和验证 |

## 官方配置筛选

从官方 `venera-configs` 提交 `d8a7116` 复制的源放在 `sources/official/`。本次只纳入当前中国大陆网络能访问默认入口的配置；包子漫画、漫小肆和 GoDa 的默认地址按实测结果做了小幅修正。Komga/Lanraragi 的公共入口可连接，但分别需要账号或自建服务配置。其余源及检测原因见 [`SOURCE_CHECK.md`](SOURCE_CHECK.md)。
