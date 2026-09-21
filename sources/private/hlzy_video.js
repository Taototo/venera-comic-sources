/** @type {import('../_venera_.js')} */
class PrivateHlzyVideo extends ComicSource {
  type = "video";
  name = "HLZY资源（私人）";
  key = "private_hlzy_video";
  version = "1.1.0";
  minAppVersion = "1.0.0";
  url = "https://cdn.jsdelivr.net/gh/Taototo/venera-comic-sources@main/sources/private/hlzy_video.js";

  _requestCache = new Map();
  _requestPending = new Map();

  settings = {
    api: {
      title: "JSON 接口",
      type: "input",
      default: "https://www.hlzyapi.vip/api.php/provide/vod/",
    },
    playbackDomain: {
      title: "播放线路",
      type: "select",
      options: [
        { value: "https://hlzy2.net", text: "hlzy2.net（备用线路）" },
        { value: "https://svip.hlzy2.net", text: "svip.hlzy2.net（原始线路）" },
      ],
      default: "https://hlzy2.net",
    },
  };

  get apiUrl() {
    let value = this.loadSetting("api") || this.settings.api.default;
    value = String(value).trim();
    if (!/^https?:\/\//i.test(value)) value = `https://${value}`;
    return value.replace(/[?&]+$/, "");
  }

  get headers() {
    return {
      "User-Agent":
        "Mozilla/5.0 (Linux; Android 12; K) AppleWebKit/537.36 Chrome/120.0.0.0 Mobile Safari/537.36",
      Accept: "application/json,text/plain,*/*",
      Referer: "https://www.hlzyapi.vip/",
    };
  }

  get playbackDomain() {
    let value =
      this.loadSetting("playbackDomain") || this.settings.playbackDomain.default;
    value = String(value).trim();
    if (!/^https?:\/\//i.test(value)) value = `https://${value}`;
    return value.replace(/\/+$/, "");
  }

  requestUrl(params) {
    let query = Object.keys(params)
      .map((key) => `${key}=${encodeURIComponent(params[key])}`)
      .join("&");
    return `${this.apiUrl}${this.apiUrl.indexOf("?") >= 0 ? "&" : "?"}${query}`;
  }

  async request(params) {
    let url = this.requestUrl(params);
    let now = Date.now();
    let cached = this._requestCache.get(url);
    let ttl = /[?&]ac=detail(?:&|$)/i.test(url) ? 30000 : 4000;
    if (cached && now - cached.time < ttl) return cached.data;
    let pending = this._requestPending.get(url);
    if (pending) return pending;
    let task = (async () => {
      let res = await Network.get(url, this.headers);
      if (res.status !== 200) throw `HLZY接口状态异常: ${res.status}`;
      let text = String(res.body || "").trim();
      if (!text || text[0] !== "{") throw "HLZY返回了无法解析的数据";
      text = text.replace(/("vod_id"\s*:\s*)(\d+)/g, '$1"$2"');
      let data;
      try {
        data = JSON.parse(text);
      } catch (_) {
        throw "HLZY返回了无效 JSON";
      }
      if (data.code !== undefined && Number(data.code) !== 1) {
        throw data.msg || "HLZY接口返回错误";
      }
      this._requestCache.set(url, { time: Date.now(), data: data });
      return data;
    })();
    this._requestPending.set(url, task);
    try {
      return await task;
    } finally {
      this._requestPending.delete(url);
    }
  }

  clean(value) {
    return String(value || "")
      .replace(/\\\//g, "/")
      .replace(/\\u0026/gi, "&")
      .replace(/\\u003d/gi, "=")
      .trim();
  }

  cover(value, id) {
    let text = this.clean(value);
    return text || `cover.${id}`;
  }

  toComic(item) {
    if (!item || item.vod_id === undefined || !item.vod_name) return null;
    let subtitle = [item.type_name, item.vod_year, item.vod_remarks]
      .filter((value) => value && String(value).trim())
      .join(" · ");
    let id = String(item.vod_id);
    return new Comic({
      id: id,
      title: String(item.vod_name),
      subTitle: subtitle,
      cover: this.cover(item.vod_pic || item.vod_pic_thumb, id),
      description: String(item.vod_blurb || item.vod_content || subtitle),
    });
  }

  parseList(data) {
    let comics = [];
    for (let item of Array.isArray(data.list) ? data.list : []) {
      let comic = this.toComic(item);
      if (comic) comics.push(comic);
    }
    return {
      comics: comics,
      maxPage: parseInt(data.pagecount, 10) || 1,
    };
  }

  async loadList(typeId, page, keyword) {
    let params = { ac: "list", pg: Number(page) || 1 };
    if (typeId) params.t = typeId;
    if (keyword) params.wd = keyword;
    return this.parseList(await this.request(params));
  }

  extractStream(value) {
    let text = this.clean(value);
    let match = text.match(
      /https?:\/\/[^"'<>\\\s]+?(?:\.m3u8|\.mp4)(?:\?[^"'<>\\\s]*)?/i
    );
    return match ? match[0].replace(/[),;]+$/, "") : "";
  }

  normalizeStreamUrl(value) {
    let url = this.extractStream(value);
    if (!url) return url;
    return url.replace(
      /^https?:\/\/svip\.hlzy2\.net/i,
      this.playbackDomain
    );
  }

  extractEntries(item) {
    let groups = String(item && item.vod_play_url || "").split("$$$");
    let playFrom = String(item && item.vod_play_from || "").split("$$$");
    let grouped = {};
    for (let groupIndex = 0; groupIndex < groups.length; groupIndex++) {
      let group = groups[groupIndex];
      let route = (playFrom[groupIndex] || "").trim() ||
        (groups.length > 1 ? `线路${groupIndex + 1}` : "默认线路");
      let chapters = grouped[route] || {};
      for (let entry of group.split("#")) {
        let value = this.clean(entry).trim();
        if (!value) continue;
        let separator = value.indexOf("$");
        let label = separator >= 0 ? value.substring(0, separator).trim() : "播放";
        let url = separator >= 0 ? value.substring(separator + 1).trim() : value;
        url = this.normalizeStreamUrl(url);
        if (!url) continue;
        if (!chapters[url]) chapters[url] = label || "播放";
      }
      if (Object.keys(chapters).length > 0) grouped[route] = chapters;
    }
    if (Object.keys(grouped).length === 1) return grouped[Object.keys(grouped)[0]];
    return grouped;
  }

  chapterCount(chapters) {
    let count = 0;
    for (let key of Object.keys(chapters || {})) {
      let value = chapters[key];
      count += value && typeof value === "object" ? Object.keys(value).length : 1;
    }
    return count;
  }

  firstChapterId(chapters) {
    for (let key of Object.keys(chapters || {})) {
      let value = chapters[key];
      if (value && typeof value === "object") {
        let nested = this.firstChapterId(value);
        if (nested) return nested;
      } else {
        return key;
      }
    }
    return "";
  }

  categoryPart(name, entries) {
    return {
      name: name,
      type: "fixed",
      categories: entries.map((entry) => entry[0]),
      itemType: "category",
      categoryParams: entries.map((entry) => String(entry[1])),
    };
  }

  explore = [
    {
      title: "HLZY资源",
      type: "multiPartPage",
      load: async () => {
        let sections = [
          ["最新更新", ""],
          ["乱伦专区", "29"],
          ["日韩专区", "30"],
          ["精品专区", "31"],
        ];
        let result = await Promise.all(
          sections.map(async (section) => {
            try {
              let page = await this.loadList(section[1], 1);
              return page.comics.length > 0
                ? { title: section[0], comics: page.comics }
                : null;
            } catch (_) {
              return null;
            }
          })
        );
        return result.filter((section) => section != null);
      },
    },
  ];

  category = {
    title: "HLZY资源",
    parts: [
      this.categoryPart("乱伦专区", [["全部", 29], ["原创乱伦", 21], ["鬼父操女", 22], ["嫂子诱惑", 25], ["姐夫小姨子", 26], ["兄弟姐妹", 27], ["风韵岳母", 28], ["儿媳献穴", 34], ["家族淫趴", 40]]),
      this.categoryPart("日韩专区", [["全部", 30], ["中文字幕", 23], ["制服诱惑", 24], ["师生迷情", 36], ["AV解说", 39], ["SM重味", 60], ["伦理影片", 61], ["日韩无码", 64], ["强奸乱伦", 65]]),
      this.categoryPart("精品专区", [["全部", 31], ["吃瓜黑料", 32], ["酒店探花", 33], ["SM调教", 35], ["AI换脸", 37], ["国产主播", 38], ["淫母兽儿", 41], ["近亲相奸", 42], ["欧美劲爆", 59]]),
      this.categoryPart("图片专区", [["全部", 43], ["唯美写真", 44], ["网友自拍", 45], ["露出激情", 46], ["街拍偷拍", 47], ["丝袜美腿", 48], ["卡通漫画", 49], ["欧美风情", 50], ["女优情报", 62]]),
      this.categoryPart("小说专区", [["全部", 51], ["都市激情", 52], ["校园情色", 53], ["少妇縱情", 54], ["国風倫理", 55], ["恋情偷情", 56], ["玄幻仙侠", 57], ["连淫幻想", 58], ["明星偶像", 63]]),
      this.categoryPart("站长推荐", [["全部", 72], ["强奸迷奸", 66], ["野战车震", 67], ["熟女少妇", 68], ["反差母狗", 69], ["人妻巨乳", 71], ["自拍偷拍", 73], ["教师学生", 74], ["3D动漫", 75], ["短视频", 79]]),
      this.categoryPart("其他", [["巨乳尤物", 70], ["人妻系列", 76], ["日韩精品", 77], ["撸管必看", 78]]),
    ],
    enableRankingPage: false,
  };

  categoryComics = {
    load: async (category, param, options, page) =>
      this.loadList(String(param || ""), page || 1),
    optionList: [],
  };

  search = {
    load: async (keyword, options, page) => {
      let value = String(keyword || "").trim();
      if (!value) return { comics: [], maxPage: 1 };
      return this.loadList("", page || 1, value);
    },
    optionList: [],
  };

  comic = {
    onThumbnailLoad: (url) => ({ headers: this.headers }),

    loadInfo: async (id) => {
      let data = await this.request({ ac: "detail", ids: String(id) });
      let item = Array.isArray(data.list) ? data.list[0] : null;
      if (!item) throw "HLZY没有找到该视频";
      let chapters = this.extractEntries(item);
      let tags = [item.type_name, item.vod_area, item.vod_year]
        .filter((value) => value && String(value).trim());
      return new ComicDetails({
        title: String(item.vod_name || "HLZY资源"),
        subTitle: String(item.vod_remarks || ""),
        cover: this.cover(item.vod_pic || item.vod_pic_thumb, id),
        description: String(item.vod_content || item.vod_blurb || ""),
        tags: { 类型: tags },
        chapters: chapters,
        url: this.requestUrl({ ac: "detail", ids: String(id) }),
        maxPage: this.chapterCount(chapters),
      });
    },

    loadEp: async (comicId, epId) => {
      let videoUrl = this.normalizeStreamUrl(epId);
      if (!videoUrl) {
        let data = await this.request({ ac: "detail", ids: String(comicId) });
        let item = Array.isArray(data.list) ? data.list[0] : null;
        if (item) {
          let chapters = this.extractEntries(item);
          videoUrl = this.normalizeStreamUrl(this.firstChapterId(chapters));
        }
      }
      if (!videoUrl) throw "HLZY当前集数没有可用的视频地址";
      return {
        images: [
          `venera-video:${JSON.stringify({
            url: videoUrl,
            title: "HLZY资源",
            headers: this.headers,
          })}`,
        ],
      };
    },
  };
}
