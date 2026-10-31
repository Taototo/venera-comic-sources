class MXS extends ComicSource {
    // 漫画源基本信息
    name = "漫小肆（18+）";
    key = "mxs";
    version = "1.0.9";
    minAppVersion = "1.5.0";
    url = "https://cdn.jsdelivr.net/gh/Taototo/venera-comic-sources@9d1a00c/sources/ven/mxs.js?v=1.0.9";

    // 漫画源设置项
    settings = {
        // 域名选择功能
        domains: {
            title: "选择域名",
            type: "select",
            options: [
                { value: "https://www.mxshm.top", text: "mxshm.top（备用）" },
                { value: "https://www.jjmhw1.top", text: "jjmhw1.top" },
                { value: "https://www.jjmh.top", text: "jjmh.top" },
                { value: "https://www.jjmh.cc", text: "jjmh.cc" },
                { value: "https://www.wzd1.cc", text: "wzd1.cc" },
                { value: "https://www.wzdhm1.cc", text: "wzdhm1.cc" },
                { value: "https://www.ikanwzd.cc", text: "ikanwzd.cc（备用）" }
            ],
            default: "https://www.jjmhw1.top"
        },
        
        // 域名检测功能
        domainCheck: {
            title: "检测当前域名",
            type: "callback",
            buttonText: "检测",
            callback: () => {
                const currentDomain = this.loadSetting("domains");
                const startTime = Date.now();
                let isCompleted = false;
                
                // 显示加载对话框
                const loadingId = UI.showLoading(() => {
                    UI.showMessage("检测已取消");
                    isCompleted = true;
                });
                
                // 10秒超时检测
                setTimeout(() => {
                    if (!isCompleted) {
                        UI.cancelLoading(loadingId);
                        UI.showMessage("❌ 连接超时，可能需要 🚀");
                        isCompleted = true;
                    }
                }, 10000);
                
                // 测试网络连接
                Network.get(currentDomain, this.headers).then(res => {
                    if (isCompleted) return;
                    const delay = Date.now() - startTime;
                    UI.cancelLoading(loadingId);
                    UI.showMessage(`✅ 连接正常，延迟: ${delay}ms`);
                    isCompleted = true;
                }).catch(() => {
                    if (isCompleted) return;
                    UI.cancelLoading(loadingId);
                    UI.showMessage("❌ 连接失败，可能需要 🚀");
                    isCompleted = true;
                });
            }
        }
    };

    // 获取基础URL
    get baseUrl() {
        return this.loadSetting("domains");
    }

    // Some of these domains reset the Rhttp connection before returning HTML.
    // Use the platform HTTP client, which follows the same path as mobile
    // browsers, for both pages and images.
    get headers() {
        return {
            "http_client": "dart:io",
            "User-Agent": "Mozilla/5.0 (Linux; Android 10; K; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/130.0.0.0 Mobile Safari/537.36",
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
            "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
            "Referer": `${this.baseUrl}/`
        };
    }

    // 解析普通漫画列表
    parseComicList(items) {
        const comics = [];
        
        for (let item of items) {
            // 提取漫画ID
            const linkElem = item.querySelector("a[href^='/book/']");
            const id = linkElem.attributes.href.split("/").pop();
            
            // 提取标题和作者
            const title = item.querySelector(".title a")?.text?.trim();
            const author = item.querySelector("span a")?.text?.trim();
            
            // 提取描述信息
            const description = item.querySelector(".chapter")?.text?.replace(/^更新/, "")?.replace(/\s+/g, " ")?.trim() || item.querySelector(".zl")?.text?.trim();

            // 验证必要字段并创建漫画对象
            if (id && title) {
                comics.push(new Comic({
                    id: id,
                    title: title,
                    subTitle: author,
                    cover: `${this.baseUrl}/static/upload/book/${id}/cover.jpg`,
                    description: description
                }));
            }
        }
        
        return comics;
    }

    // 解析热门漫画列表
    parseHotComicList(items) {
        const comics = [];
        
        for (let item of items) {
            // 提取漫画ID
            const linkElem = item.querySelector(".cover a[href^='/book/']");
            const id = linkElem.attributes.href.split("/").pop();
            
            // 提取标题、作者和点击量
            const title = item.querySelector(".info .title a")?.text?.trim();
            const author = item.querySelector(".info .desc")?.text?.trim();
            const clickCount = item.querySelector(".info .subtitle span a")?.text?.trim();

            // 提取标签信息
            const tags = [];
            const tagElems = item.querySelectorAll(".info .tag a");
            for (let tagElem of tagElems) {
                if (tagElem.text) tags.push(tagElem.text.trim());
            }

            // 验证必要字段并创建漫画对象
            if (id && title) {
                comics.push(new Comic({
                    id: id,
                    title: title,
                    subTitle: author,
                    cover: `${this.baseUrl}/static/upload/book/${id}/cover.jpg`,
                    tags: tags,
                    description: `热度: 🔥${clickCount}`
                }));
            }
        }
        
        return comics;
    }

    textOf(element) {
        return element && element.text ? String(element.text).replace(/\s+/g, " ").trim() : "";
    }

    attribute(element, name) {
        return element && element.attributes ? element.attributes[name] || "" : "";
    }

    bookId(href) {
        const match = String(href || "").match(/(?:^|\/)book\/(\d+)/);
        return match ? match[1] : "";
    }

    coverUrl(value, id) {
        let cover = String(value || "").trim();
        if (!cover) return id ? this.baseUrl + "/static/upload/book/" + id + "/cover.jpg" : "";
        if (/^https?:\/\//i.test(cover)) {
            cover = cover.replace(/^https?:\/\/[^/]+/i, "");
        } else if (cover.indexOf("//") === 0) {
            cover = cover.replace(/^\/\/[^/]+/i, "");
        }
        return this.baseUrl + (cover.indexOf("/") === 0 ? "" : "/") + cover;
    }

    parseList(document) {
        const comics = this.parseComicList(document.querySelectorAll(".manga-list-2 li, .mh-list .mh-item"));
        return comics.length ? comics : this.parseComicList(document.querySelectorAll(".manga-list-2 a[href*='book/'], .mh-item a[href*='book/']"));
    }

    parsePageCount(document) {
        let maxPage = 1;
        for (let link of document.querySelectorAll(".pagination a[href*='page=']")) {
            const match = this.attribute(link, "href").match(/[?&]page=(\d+)/);
            if (match) maxPage = Math.max(maxPage, Number(match[1]));
        }
        return maxPage;
    }

    // Support both the current .mh-item markup and older source templates.
    parseComicList(items) {
        const comics = [];
        const seen = {};
        for (let item of items) {
            const itemHref = this.attribute(item, "href");
            const linkElem = itemHref ? item : (item.querySelector(".manga-list-2-title a[href*='book/']") ||
                item.querySelector(".title a[href*='book/']") ||
                item.querySelector("a[href*='book/']"));
            const id = this.bookId(itemHref || this.attribute(linkElem, "href"));
            const title = this.textOf(item.querySelector(".manga-list-2-title a")) ||
                this.textOf(item.querySelector(".rank-list-info-right-title")) ||
                this.textOf(item.querySelector(".title a")) ||
                this.textOf(linkElem) || this.attribute(linkElem, "title");
            const image = item.querySelector(".manga-list-2-cover img") ||
                item.querySelector(".rank-list-cover img") ||
                item.querySelector("img");
            const cover = this.coverUrl(
                this.attribute(image, "data-original") || this.attribute(image, "data-src") || this.attribute(image, "src"),
                id,
            );
            const author = this.textOf(item.querySelector(".author")) ||
                this.textOf(item.querySelector("span a"));
            const description = this.textOf(item.querySelector(".manga-list-2-tip")) ||
                this.textOf(item.querySelector(".rank-list-info-right-subtitle")) ||
                this.textOf(item.querySelector(".chapter")).replace(/^更新/, "") ||
                this.textOf(item.querySelector(".zl"));
            if (id && title && !seen[id]) {
                seen[id] = true;
                comics.push(new Comic({
                    id: id,
                    title: title,
                    subTitle: author,
                    cover: cover,
                    description: description,
                }));
            }
        }
        return comics;
    }

    // 解析评论列表
    parseCommentList(items) {
        const comments = [];
        
        for (let item of items) {
            // 提取评论信息
            const userName = item.querySelector(".title")?.text?.trim();
            const content = item.querySelector(".content")?.text?.trim();
            const time = item.querySelector(".bottom")?.text?.match(/\d{4}-\d{2}-\d{2}/)?.[0]?.trim();
            const avatar = item.querySelector(".cover img")?.attributes?.src;

            // 验证必要字段并创建评论对象
            if (userName && content) {
                comments.push(new Comment({
                    userName: userName,
                    avatar: `${this.baseUrl}${avatar}`,
                    content: content,
                    time: time
                }));
            }
        }
        
        return comments;
    }

    // 执行网络请求并返回HTML文档对象
    async fetchDocument(url) {
        const res = await Network.get(url, this.headers);
        
        if (res.status !== 200) {
            throw `请求失败: ${res.status}`;
        }
        
        return new HtmlDocument(res.body);
    }

    // === 探索页面配置 ===
    explore = [
        {
            title: "漫小肆",
            type: "multiPageComicList",
            load: async (page) => {
                const currentPage = Number(page) || 1;
                // The dedicated update page returns a consistent, paginated card list across mirrors.
                const doc = await this.fetchDocument(`${this.baseUrl}/update?page=${currentPage}`);
                const comics = this.parseList(doc);
                const maxPage = this.parsePageCount(doc);
                doc.dispose();
                return { comics, maxPage };
            }
        }
    ];

    // === 分类页面配置 ===
    category = {
        title: "漫小肆",
        parts: [
            {
                name: "推荐",
                type: "fixed",
                categories: ["最近更新", "排行榜", "全部漫画"],
                itemType: "category"
            },
            {
                name: "题材",
                type: "fixed",
                categories: [
                    "都市", "校园", "青春", "性感", "长腿", "多人", "御姐", "巨乳",
                    "新婚", "媳妇", "暧昧", "清纯", "调教", "少妇", "风骚", "同居", 
                    "淫乱", "好友", "女神", "诱惑", "偷情", "出轨", "正妹", "家教"
                ],
                itemType: "category"
            }
        ],
        enableRankingPage: false
    };

    // === 分类漫画加载配置 ===
    categoryComics = {
        // 加载分类漫画
        load: async (category, param, options, page) => {
            // 根据分类构建不同的请求URL
            let url;
            if (category === "最近更新") {
                url = `${this.baseUrl}/update?page=${page}`;
            } else if (category === "排行榜") {
                url = `${this.baseUrl}/rank`;
            } else {
                const tag = (category !== "全部漫画") ? category : "全部";
                const area = options[0] || "-1";
                const end = options[1] || "-1";
                url = `${this.baseUrl}/booklist?tag=${encodeURIComponent(tag)}&area=${area}&end=${end}&page=${page}`;
            }

            const doc = await this.fetchDocument(url);
            let comics = [];

            // 排行榜特殊处理
            if (category === "排行榜") {
                const rankKey = String(options[0] || "new").split("-")[0];
                const rankListByKey = {
                    "new": "rankList_1",
                    "total": "rankList_2",
                    "popular": "rankList_2",
                    "month": "rankList_3",
                    "end": "rankList_4",
                    "recommend": "rankList_5",
                };
                const rankTitleByKey = {
                    "new": "新书榜",
                    "total": "总榜",
                    "popular": "总榜",
                    "month": "月榜",
                    "end": "完结榜",
                    "recommend": "推荐",
                };
                const rankListId = rankListByKey[rankKey] || "rankList_1";
                let rankItems = [];
                const rankSections = doc.querySelectorAll(".top-cat li");
                for (let section of rankSections) {
                    if (this.textOf(section.querySelector(".title")) === rankTitleByKey[rankKey]) {
                        rankItems = section.querySelectorAll(".mh-item");
                        break;
                    }
                }
                if (rankItems.length === 0) {
                    rankItems = doc.querySelectorAll("#" + rankListId + " .mh-item, #" + rankListId + " li");
                }
                if (rankItems.length === 0) {
                    rankItems = doc.querySelectorAll(".rank-list .mh-item, .rank-list li, .rank-list a[href*='book/']");
                }
                comics = this.parseComicList(rankItems);
                doc.dispose();
                return { comics, maxPage: 1 };
            } else {
                // 普通分类处理
                comics = this.parseList(doc);
            }

            const maxPage = category === "排行榜" ? 1 : this.parsePageCount(doc);
            doc.dispose();
            return { comics, maxPage };
        },

        // 动态加载分类选项
        optionLoader: async (category, param) => {
            if (category === "最近更新") {
                return [];
            } else if (category === "排行榜") {
                return [{
                    options: [
                        "new-新书榜",
                        "total-总榜",
                        "month-月榜",
                        "end-完结榜",
                        "recommend-推荐"
                    ]
                }];
            } else {
                return [
                    {
                        label: "地区",
                        options: [
                            "-全部",
                            "1-韩国", 
                            "2-日本",
                            "3-台湾"
                        ]
                    },
                    {
                        label: "状态",
                        options: [
                            "-全部",
                            "0-连载",
                            "1-完结"
                        ]
                    }
                ];
            }
        }
    };

    // === 搜索功能配置 ===
    search = {
        // 搜索漫画
        load: async (keyword, options, page) => {
            const url = `${this.baseUrl}/search?keyword=${encodeURIComponent(keyword)}`;
            const doc = await this.fetchDocument(url);
            const comics = this.parseList(doc);
            
            doc.dispose();
            return {
                comics: comics,
                maxPage: 1
            };
        },
        enableTagsSuggestions: false
    };

    // === 漫画详情和阅读功能配置 ===
    comic = {
        // 加载漫画详情
        loadInfo: async (id) => {
            const url = `${this.baseUrl}/book/${id}`;
            const doc = await this.fetchDocument(url);

            // 提取标题信息
            const title = this.textOf(doc.querySelector(".info h1")) ||
                this.textOf(doc.querySelector("h1")) ||
                `漫小肆漫画 ${String(id)}`;

            // 提取副标题信息（别名和作者）
            let author = "";
            let subTitle = "";
            const subTitleElems = doc.querySelectorAll(".info .subtitle");
            for (let elem of subTitleElems) {
                const text = this.textOf(elem);
                if (text.includes("别名：")) subTitle = text.replace("别名：", "").trim();
                if (text.includes("作者：")) author = text.replace("作者：", "").trim();
            }
            const authors = author ? author.split("&").map(a => a.trim()).filter(a => a) : [];

            // 提取其他信息（状态、地区、更新时间、点击量和描述信息）
            let status = "";
            let area = "";
            let updateTime = "";
            let clickCount = "";
            const tipText = this.textOf(doc.querySelector(".info .tip"));
            const readTipValue = (label) => {
                const labels = "状态|地区|更新时间|点击|标签";
                const match = tipText.match(new RegExp(
                    label + "\\s*[：:]\\s*([\\s\\S]*?)(?=\\s*(?:" + labels + ")\\s*[：:]|$)"
                ));
                return match ? match[1].trim() : "";
            };
            status = readTipValue("状态");
            area = readTipValue("地区");
            updateTime = readTipValue("更新时间");
            clickCount = readTipValue("点击");
            const description = this.textOf(doc.querySelector(".info .content"));

            // 提取标签信息
            const tagList = [];
            const tagElems = doc.querySelectorAll(".info .tip a[href*='tag=']");
            for (let elem of tagElems) {
                const tagName = this.textOf(elem);
                if (tagName) tagList.push(tagName);
            }

            // 提取章节列表
            const chapters = {};
            const chapterElems = doc.querySelectorAll("#detail-list-select li a");
            for (let elem of chapterElems) {
                const chapterUrl = elem.attributes?.href;
                const chapterTitle = this.textOf(elem);
                if (chapterUrl && chapterTitle) {
                    const chapterId = chapterUrl.split("/").pop();
                    if (chapterId) chapters[chapterId] = chapterTitle;
                }
            }

            // 提取评论和推荐漫画
            const comments = this.parseCommentList(doc.querySelectorAll(".view-comment-main .postlist li.dashed"));
            const recommend = this.parseList(doc);

            doc.dispose();
            
            // 创建并返回漫画详情对象
            return new ComicDetails({
                title: String(title),
                subTitle: String(subTitle || ""),
                cover: `${this.baseUrl}/static/upload/book/${id}/cover.jpg`,
                description: String(description || ""),
                tags: {
                    "作者": authors,
                    "题材": tagList,
                    "地区": area ? [String(area)] : [],
                    "状态": status ? [String(status)] : [],
                    "更新时间": updateTime ? [String(updateTime)] : [],
                    "点击量": clickCount ? [String(clickCount)] : []
                },
                chapters: chapters,
                recommend: recommend,
                commentCount: comments.length,
                updateTime: updateTime,
                url: url,
                comments: comments
            });
        },

        // 加载章节图片
        loadEp: async (comicId, epId) => {
            const url = `${this.baseUrl}/chapter/${epId}`;
            const doc = await this.fetchDocument(url);

            // 提取懒加载图片
            const images = [];
            const imageElems = doc.querySelectorAll("img.lazy");
            for (let img of imageElems) {
                const src = img.attributes?.["data-original"];
                const image = src.replace(/https?:\/\/[^\/]+/, this.baseUrl);
                if (image) images.push(image);
            }

            if (images.length === 0) {
                doc.dispose();
                throw "本章中未找到图片";
            }

            doc.dispose();
            return {
                images: images
            };
        },

        // 加载评论列表
        loadComments: async (comicId, subId, page, replyTo) => {
            const url = `${this.baseUrl}/book/${comicId}`;
            const doc = await this.fetchDocument(url);

            const comments = this.parseCommentList(doc.querySelectorAll(".view-comment-main .postlist li.dashed"));

            doc.dispose();
            return {
                comments: comments,
                maxPage: 1
            };
        },

        onImageLoad: () => ({ headers: this.headers }),
        onThumbnailLoad: () => ({ headers: this.headers }),

        // 处理标签点击事件
        onClickTag: (namespace, tag) => {
            // 作者标签跳转到搜索页面
            if (namespace === "作者") {
                return {
                    page: "search",
                    attributes: {
                        keyword: tag
                    }
                };
            }
            // 题材标签跳转到分类页面
            else if (namespace === "题材") {
                return {
                    page: "category",
                    attributes: {
                        category: tag
                    }
                };
            }
        },
        enableTagsTranslate: false
    };
}
