/** @type {import('../_venera_.js')} */
class Hmanwu extends ComicSource {
  name = "韩漫屋（18+）";
  key = "private_hmanwu";
  version = "1.1.2";
  minAppVersion = "1.0.0";
  url = "https://cdn.jsdelivr.net/gh/Taototo/venera-comic-sources@main/sources/private/hmanwu.js";

  settings = {
    domain: {
      title: "域名",
      type: "input",
      default: "hmanwu.com",
    },
  };

  get baseUrl() {
    let domain = this.loadSetting("domain") || this.settings.domain.default;
    domain = String(domain).trim().replace(/^https?:\/\//i, "").replace(/\/+$/, "");
    return `https://${domain}`;
  }

  get headers() {
    let headers = {
      "User-Agent":
        "Mozilla/5.0 (Linux; Android 10; K; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/130.0.0.0 Mobile Safari/537.36",
      Accept: "application/json",
      Referer: `${this.baseUrl}/`,
    };
    let token = this.loadData("token");
    if (token) headers.Authorization = `Bearer ${token}`;
    return headers;
  }

  query(params) {
    let parts = [];
    for (let key of Object.keys(params || {})) {
      let value = params[key];
      if (value === null || value === undefined || value === "") continue;
      parts.push(`${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`);
    }
    return parts.length > 0 ? `?${parts.join("&")}` : "";
  }

  async request(path, params, method, body) {
    let url = `${this.baseUrl}${path}${this.query(params)}`;
    let verb = String(method || "GET").toUpperCase();
    let res;
    if (verb === "POST") {
      res = await Network.post(
        url,
        Object.assign({}, this.headers, { "Content-Type": "application/json" }),
        body === undefined ? null : JSON.stringify(body)
      );
    } else if (verb === "DELETE") {
      res = await Network.delete(url, this.headers);
    } else {
      res = await Network.get(url, this.headers);
    }
    if (res.status !== 200) throw `请求失败: ${res.status}`;

    let payload;
    try {
      payload = JSON.parse(res.body);
    } catch (error) {
      throw "返回数据格式错误";
    }
    if (!payload || payload.code !== 200) {
      throw (payload && payload.message) || "接口请求失败";
    }
    return payload.data || {};
  }

  account = {
    login: async (username, password) => {
      let data = await this.request("/api/auth/login", null, "POST", {
        username: String(username || ""),
        password: String(password || ""),
      });
      if (!data.token) throw "登录响应中没有令牌";
      this.saveData("token", data.token);
      return data.user || "ok";
    },

    logout: () => {
      this.deleteData("token");
    },
  };

  values(value) {
    let source = Array.isArray(value) ? value : String(value || "").split(",");
    let result = [];
    for (let item of source) {
      let text = String(item || "").trim();
      if (text && result.indexOf(text) < 0) result.push(text);
    }
    return result;
  }

  parseComic(item) {
    if (!item || item.id === null || item.id === undefined) return null;
    let id = String(item.id);
    let tags = this.values(item.category).concat(this.values(item.tags));
    tags = tags.filter((tag, index) => tags.indexOf(tag) === index);
    return new Comic({
      id: id,
      title: String(item.title || `漫画 ${id}`),
      subTitle: String(item.author || ""),
      cover: String(item.cover_url || ""),
      tags: tags,
      description: String(item.description || item.category || ""),
    });
  }

  parseList(data) {
    let pageSize = Number(data.page_size) || 25;
    let total = Number(data.total) || 0;
    let comics = (data.list || []).map((item) => this.parseComic(item)).filter(Boolean);
    return {
      comics: comics,
      maxPage: total > 0 ? Math.ceil(total / pageSize) : 1,
    };
  }

  parseHomeList(value) {
    let comics = [];
    let seen = {};
    for (let item of Array.isArray(value) ? value : []) {
      let comic = this.parseComic(item);
      if (!comic || seen[comic.id]) continue;
      seen[comic.id] = true;
      comics.push(comic);
    }
    return comics;
  }

  parseHome(data) {
    let sections = [
      { title: "推荐", key: "home_featured", list: data && data.featured },
      { title: "最近更新", key: "home_latest", list: data && data.latest },
      { title: "已完结", key: "home_completed", list: data && data.completed },
    ];
    return sections
      .map((section) => ({
        title: section.title,
        comics: this.parseHomeList(section.list),
        viewMore: `category:${section.title}@${section.key}`,
      }))
      .filter((section) => section.comics.length > 0);
  }

  listParams(page, extra) {
    return Object.assign(
      {
        page: Math.max(1, Number(page) || 1),
        page_size: 25,
        sort: "id",
        crawl_status: 1,
      },
      extra || {}
    );
  }

  explore = [
    {
      title: "韩漫屋",
      type: "multiPartPage",
      load: async () => this.parseHome(await this.request("/api/home")),
    },
  ];

  category = {
    title: "韩漫屋",
    parts: [
      {
        name: "首页",
        type: "fixed",
        categories: ["推荐", "最近更新", "已完结"],
        itemType: "category",
        categoryParams: ["home_featured", "home_latest", "home_completed"],
      },
      {
        name: "分类",
        type: "fixed",
        categories: [
          "全部",
          "全彩",
          "同人",
          "CG杂图",
          "英语 ENG",
          "短篇",
          "长篇",
          "NTR",
          "纯爱",
          "生肉",
          "耽美花园",
          "SM",
          "强暴",
          "扶他乐园",
          "姐姐系",
          "性转换",
          "伪娘哲学",
          "Cosplay",
          "欧美",
          "Love Live",
          "东方",
          "Fate",
          "舰队收藏",
          "SAO 刀剑神域",
          "足之恋",
          "碧蓝幻想",
          "耽美花園",
          "強暴",
          "長篇",
          "非人類",
          "CG雜圖",
          "重口地帶",
          "後宮閃光",
          "純愛",
          "性轉換",
          "扶他樂園",
          "偽娘哲學",
          "禁書目錄",
          "艦隊收藏",
          "東方",
          "百合花園",
          "圓神領域",
          "足の恋",
          "單行本",
          "英語 ENG",
          "歐美",
          "嗶咔漢化",
          "碧藍幻想",
          "SAO 刀劍神域",
          "重口地带",
          "非人类",
          "百合花园",
          "人妻",
          "禁书目录",
          "妹妹系",
          "WEBTOON",
          "后宫闪光",
          "单行本",
        ],
        itemType: "category",
        categoryParams: [
          "",
          "全彩",
          "同人",
          "CG杂图",
          "英语 ENG",
          "短篇",
          "长篇",
          "NTR",
          "纯爱",
          "生肉",
          "耽美花园",
          "SM",
          "强暴",
          "扶他乐园",
          "姐姐系",
          "性转换",
          "伪娘哲学",
          "Cosplay",
          "欧美",
          "Love Live",
          "东方",
          "Fate",
          "舰队收藏",
          "SAO 刀剑神域",
          "足之恋",
          "碧蓝幻想",
          "耽美花園",
          "強暴",
          "長篇",
          "非人類",
          "CG雜圖",
          "重口地帶",
          "後宮閃光",
          "純愛",
          "性轉換",
          "扶他樂園",
          "偽娘哲學",
          "禁書目錄",
          "艦隊收藏",
          "東方",
          "百合花園",
          "圓神領域",
          "足の恋",
          "單行本",
          "英語 ENG",
          "歐美",
          "嗶咔漢化",
          "碧藍幻想",
          "SAO 刀劍神域",
          "重口地带",
          "非人类",
          "百合花园",
          "人妻",
          "禁书目录",
          "妹妹系",
          "WEBTOON",
          "后宫闪光",
          "单行本",
        ],
      },
    ],
    enableRankingPage: false,
  };

  categoryComics = {
    load: async (category, param, options, page) => {
      let categoryName = String(param || "");
      let homeParams = {
        home_featured: { tag: "WEBTOON", sort: "views" },
        home_latest: { tag: "WEBTOON", sort: "id" },
        home_completed: { tag: "WEBTOON", status: "1", sort: "views" },
      }[categoryName];
      return this.parseList(
        await this.request(
          "/api/comics",
          this.listParams(
            page,
            homeParams || (categoryName ? { category: categoryName } : {})
          )
        )
      );
    },
    optionList: [],
  };

  search = {
    load: async (keyword, options, page) => {
      return this.parseList(
        await this.request(
          "/api/comics",
          this.listParams(page, { q: String(keyword || "").trim() })
        )
      );
    },
    optionList: [],
  };

  formatDate(value) {
    return value ? String(value).replace("T", " ").replace(/\.\d+Z$/, "") : "";
  }

  comic = {
    loadInfo: async (id) => {
      let comicId = String(id || "");
      let data = await this.request(`/api/comics/${encodeURIComponent(comicId)}/detail`);
      let comic = data.comic || {};
      let rawChapters = Array.isArray(data.chapters) ? data.chapters : [];
      let orderedChapters = rawChapters
        .filter((chapter) => {
          return (
            chapter &&
            chapter.id !== null &&
            chapter.id !== undefined &&
            !(chapter.crawl_status !== undefined && Number(chapter.crawl_status) === 0)
          );
        })
        .slice()
        .sort((a, b) => {
          let aNum = Number(a.chapter_num);
          let bNum = Number(b.chapter_num);
          if (Number.isFinite(aNum) && Number.isFinite(bNum) && aNum !== bNum) {
            return aNum - bNum;
          }
          let aTime = Date.parse(a.created_at || "");
          let bTime = Date.parse(b.created_at || "");
          if (Number.isFinite(aTime) && Number.isFinite(bTime) && aTime !== bTime) {
            return aTime - bTime;
          }
          return Number(a.id) - Number(b.id);
        });
      let chapters = new Map();
      for (let chapter of orderedChapters) {
        let title = chapter.title || (chapter.chapter_num ? `第${chapter.chapter_num}话` : "阅读");
        // Prefix numeric IDs so JS/Dart object conversion cannot reorder chapters by key.
        chapters.set(`chapter-${String(chapter.id)}`, String(title));
      }

      let categories = this.values(comic.category);
      let tags = this.values(comic.tags);
      let status = Number(comic.status) === 1 ? "已完结" : "连载中";
      let updateTime = orderedChapters.length
        ? this.formatDate(orderedChapters[orderedChapters.length - 1].created_at)
        : "";
      return {
        title: String(comic.title || "韩漫屋"),
        subtitle: String(comic.author || ""),
        cover: String(comic.cover_url || ""),
        description: String(comic.description || ""),
        tags: {
          "作者": comic.author ? [String(comic.author)] : [],
          "分类": categories,
          "标签": tags,
          "状态": [status],
        },
        chapters: chapters,
        isFavorite: data.favorited === true,
        subId: comic.id === undefined ? comicId : String(comic.id),
        commentCount: undefined,
        updateTime: updateTime,
        url: `${this.baseUrl}/comic/${encodeURIComponent(comicId)}`,
      };
    },

    loadEp: async (comicId, epId) => {
      let chapterId = String(epId || comicId || "");
      let prefixedId = chapterId.match(/^chapter-(\d+)$/i);
      if (prefixedId) chapterId = prefixedId[1];
      let data = await this.request(`/api/chapters/${encodeURIComponent(chapterId)}/read`);
      let images = (data.images || [])
        .slice()
        .sort((a, b) => Number(a.page_num || 0) - Number(b.page_num || 0))
        .map((item) => String(item && item.image_url ? item.image_url : ""))
        .filter((url, index, all) => url && all.indexOf(url) === index);
      if (images.length === 0) throw "本章中未找到图片";
      return { images: images };
    },

    loadComments: async (comicId, subId, page, replyTo) => {
      let pageSize = 20;
      let data = await this.request(`/api/comics/${encodeURIComponent(subId || comicId)}/comments`, {
        page: Math.max(1, Number(page) || 1),
        page_size: pageSize,
      });
      let comments = (data.list || []).map((item) => {
        let user = item.user || {};
        return new Comment({
          userName: String(user.nickname || user.username || "匿名用户"),
          avatar: "",
          content: String(item.content || ""),
          time: this.formatDate(item.created_at),
          id: item.id === undefined ? "" : String(item.id),
        });
      });
      return {
        comments: comments,
        maxPage: Number(data.total) > 0 ? Math.ceil(Number(data.total) / pageSize) : 1,
      };
    },

    sendComment: async (comicId, subId, content, replyTo) => {
      await this.request(
        `/api/comics/${encodeURIComponent(subId || comicId)}/comments`,
        null,
        "POST",
        { content: String(content || "") }
      );
      return "ok";
    },

    onImageLoad: () => ({}),
    onThumbnailLoad: () => ({}),
    link: {
      domains: ["hmanwu.com"],
      linkToId: (url) => {
        let match = String(url || "").match(
          /^https?:\/\/(?:www\.)?hmanwu\.com\/(?:comic|read)\/(\d+)/i
        );
        return match ? match[1] : null;
      },
    },
  };

  favorites = {
    multiFolder: false,

    addOrDelFavorite: async (comicId, folderId, isAdding) => {
      await this.request(
        `/api/comics/${encodeURIComponent(comicId)}/favorite`,
        null,
        isAdding ? "POST" : "DELETE"
      );
      return "ok";
    },

    loadComics: async (page) => {
      let pageSize = 25;
      let data = await this.request("/api/me/favorites", {
        page: Math.max(1, Number(page) || 1),
        page_size: pageSize,
      });
      let comics = (data.list || [])
        .map((item) => this.parseComic(item.comic || item))
        .filter(Boolean);
      return {
        comics: comics,
        maxPage: Number(data.total) > 0 ? Math.ceil(Number(data.total) / pageSize) : 1,
      };
    },
  };
}
