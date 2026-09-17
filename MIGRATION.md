# hj.json 迁移记录

`legacy/hj.json` 是原始 Legado `bookSource` 数组。本次按 Venera JavaScript 规范逐站验证，只把列表、详情、章节和图片链路都能确认的条目转换为私人源。

## 已转换并保留

| 原始条目 | Venera 文件 | 结果 |
| --- | --- | --- |
| 包子漫画 | `sources/private/baozi.js` | 保留，显示为“私人” |
| 18真人图集 | `sources/private/mh18.js` | 保留，按分页生成章节 |
| 紳士漫畫·国内直连 | `sources/private/wnacg.js` | 保留，支持自定义域名 |
| 中国人能飞 | `sources/private/mh250.js` | 新增 |
| 魅影画廊 | `sources/private/myhl.js` | 新增 |
| 歪歪漫画 | `sources/private/waimanhua.js` | 新增，使用公开 JSON 接口 |
| 直连韩漫网 | `sources/private/ssmhw.js` | 新增 |

## 已验证但按请求移除

| 原始条目 | 处理 |
| --- | --- |
| 漫画1234 | 曾转换为私人源，现按请求移除 |

## 未转换

巴卡漫画（403）、漫画家（连接重置）、鸟鸟韩漫（超时）、武芊漫画（超时）、野蛮漫画（跳转百度）、4KHD 美图（原域名为跳转脚本且备用站不稳定）、CosplayTele（超时）、神奇漫画两站（正文规则为加密载荷，无法可靠转换）、肉漫屋（超时）。

`Buondua图集` 曾在早期检查中可访问，但本次复检持续超时，因此没有放入当前清单。网络状态变化后可重新验证再添加。
