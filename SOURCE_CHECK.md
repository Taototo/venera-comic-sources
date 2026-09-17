# 官方漫画源连通性检测

检测日期：2026-09-17（中国大陆网络环境）

检测对象是官方 `venera-configs` 当前清单（提交 `d8a7116`）中的源。对每个源请求其配置中的默认首页或实际列表/API入口；关键入口使用 IPv4、HTTP/1.1 和浏览器 User-Agent 重试。`200` 或接口返回正常业务 JSON 视为可搬运；`401` 表示网络可达但需要账号；持续超时、连接重置、TLS/DNS 失败、`403` 或接口 `5xx` 不放入本仓库清单。检测只代表本次网络出口，站点后续变更时结果可能变化。

## 已搬运的官方源

| 源 | 检测入口 | 结果与处理 |
| --- | --- | --- |
| 拷贝漫画 | `api.copy2000.online/api/v3/h5/homeIndex` | `200`；响应较慢，保留并使用官方 API |
| 包子漫画 | `tw.bzmgcn.com/` | `200`；`cn.bzmgcn.com` 返回 `403`，副本默认改为 `tw` |
| comick | `comick.art/home`、`/api/search` | `200`；保留 |
| 再漫画 | `/app/v1/comic/update/list/0/1`、`comic/filter/list` | `200`；保留 |
| GoDa漫画 | `godamh.com/`、`v2.apikk.top/api/v2/manga/get`、`chapter/getinfo` | `200`；图片实测使用 `c-nc-1.6wm.top`，副本已修正默认图片域名 |
| 漫小肆 | `jjmhw1.top`、`jjmh.top`、`jjmh.cc`、`wzd1.cc`、`wzdhm1.cc` | 均 `200`；副本只保留这些域名，默认 `jjmhw1.top` |
| 漫画人 | `www.manhuaren.com/`、`/search` | `200`；保留 |
| 漫画1234 | `b.amh1234.com/`、`/search` | `200`；保留 |
| Lanraragi | `lrr.tvc-16.science/api/categories`、`/api/search` | `200`；保留，仍可在源设置中改为自建服务 |
| Komga | `demo.komga.org/` | 首页 `200`，API `401`；网络可达但演示 API 需账号，保留并提示填写自己的服务器 |

## 未搬运的官方源

| 源 | 检测结果 | 未搬运原因 |
| --- | --- | --- |
| 拷贝漫画（多账号） | 与单账号版共用 `copy_manga` key | 避免清单 key 冲突，已选择版本较新的单账号版 |
| 少年ジャンプ＋ | 官网 `200`，但官方匿名令牌接口 `/api/v1/user_account/access_token` 返回 `410 Gone` | 实际配置无法初始化，未搬运 |
| Komiic | 连接被重置（`000`） | 当前网络无法稳定建立连接 |
| Picacg | `/comics/random` 持续超时（`000`） | 实际 API 入口不可达 |
| nhentai | `403`，并出现超时 | 站点被拦截/无法稳定访问 |
| 紳士漫畫 | `www.wnacg.com` 首页和搜索持续超时（`000`） | 当前网络不可达；HJ 自定义源仍保留，可自行更换域名 |
| ehentai | 首页持续超时（`000`） | 当前网络不可达 |
| 禁漫天堂 | `cdntwice.org` 返回 `403`，其余备用域名 DNS 失败 | 没有可稳定访问的默认线路 |
| MangaDex | TLS 握手失败（`000`） | 当前网络无法建立 HTTPS 连接 |
| 爱看漫 | TLS 握手失败（`000`） | 当前网络无法建立 HTTPS 连接 |
| hitomi.la | 首页持续超时（`000`） | 当前网络不可达 |
| 优酷漫画 | `403` | 站点访问被拒绝 |
| 漫画柜 | 首页持续超时（`000`） | 当前网络不可达 |
| 漫蛙吧 | API 持续超时（`000`） | 当前网络不可达 |
| カドコミ | API 返回 `403` | API 访问被拒绝 |
| CCC追漫台 | `/public/home_v2`、`/rank` 返回 `500`（`uuid错误`） | 官方当前配置无法通过公开请求完成初始化 |
| 18漫画 | `18mh.org` 首页持续超时（`000`） | 当前网络不可达；HJ 的 `18gallery.com` 源独立保留 |
| H-Comic | 连接重置/超时（`000`） | 当前网络不可达 |
| jcomic.net | 首页持续超时（`000`） | 当前网络不可达 |
| 热辣漫画 | 默认 API 持续超时（`000`） | 实际 API 入口不可达 |
| Kavita | 演示站首页持续超时（`000`） | 默认公共入口不可达 |
| 嗨皮漫画 | `m.happymh.com` DNS 失败 | 域名无法解析 |
| MYCOMIC | `mycomic.com/cn` 和图片 CDN 返回 `403` | 需要 Cloudflare/登录，无法作为默认可用源 |

官方仓库中的 `baihehui.js` 不在官方 `index.json` 清单内，本次未作为官方源搬运。
