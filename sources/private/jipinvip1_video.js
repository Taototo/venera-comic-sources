/** @type {import('../_venera_.js')} */
class PrivateJipinVip1Video extends ComicSource {
  type = "video";
  name = "极品资源（私人）";
  key = "private_jipinvip1_video";
  version = "1.1.1";
  minAppVersion = "1.0.0";
  url = "https://cdn.jsdelivr.net/gh/Taototo/venera-comic-sources@main/sources/private/jipinvip1_video.js";

  _requestCache = new Map();
  _requestPending = new Map();

  settings = {
    api: {
      title: "JSON 接口",
      type: "input",
      default: "https://jipinvip1.com/api.php/provide/vod/",
    },
    playbackDomain: {
      title: "播放线路",
      type: "select",
      options: [
        {
          value: "https://m2.jipinvipplay.com",
          text: "m2.jipinvipplay.com（原始线路）",
        },
        {
          value: "https://jipinvipplay.com",
          text: "jipinvipplay.com（备用线路）",
        },
      ],
      default: "https://m2.jipinvipplay.com",
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
      Referer: "https://jipinvip1.com/",
    };
  }

  get playbackDomain() {
    let value =
      this.loadSetting("playbackDomain") || this.settings.playbackDomain.default;
    value = String(value).trim();
    if (!/^https?:\/\//i.test(value)) value = `https://${value}`;
    return value.replace(/\/+$/, "");
  }

  get playbackHeaders() {
    let headers = Object.assign({}, this.headers);
    // The apex fallback is routed by the original virtual-host header.
    if (this.playbackDomain === "https://jipinvipplay.com") {
      headers.Host = "m2.jipinvipplay.com";
    }
    return headers;
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
      if (res.status !== 200) throw `极品资源接口状态异常: ${res.status}`;
      let text = String(res.body || "").trim();
      if (!text || text[0] !== "{") throw "极品资源返回了无法解析的数据";
      text = text.replace(/("vod_id"\s*:\s*)(\d+)/g, '$1"$2"');
      let data;
      try {
        data = JSON.parse(text);
      } catch (_) {
        throw "极品资源返回了无效 JSON";
      }
      if (data.code !== undefined && Number(data.code) !== 1) {
        throw data.msg || "极品资源接口返回错误";
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
    return { comics: comics, maxPage: parseInt(data.pagecount, 10) || 1 };
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
    // The first URL is a small master playlist. The /hls/ child playlist is
    // the actual VOD media list and avoids one extra network round trip.
    if (!url) return url;
    if (/jipinvipplay\.com/i.test(url)) {
      url = url.replace(
        /^https?:\/\/m2\.jipinvipplay\.com/i,
        this.playbackDomain
      );
      if (/\/hls\/index\.m3u8(?:[?#]|$)/i.test(url)) return url;
      return url.replace(/\/index\.m3u8(?=[?#]|$)/i, "/hls/index.m3u8");
    }
    return url;
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
      title: "极品资源",
      type: "multiPartPage",
      load: async () => {
        let sections = [
          ["最新更新", ""],
          ["视频一区", "1"],
          ["视频二区", "69"],
          ["视频四区", "79"],
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
    title: "极品资源",
    parts: [
      this.categoryPart("视频一区", [["全部", 1], ["日韩无码", 54], ["国产精品", 55]]),
      this.categoryPart("视频二区", [["全部", 69], ["巨乳系列", 70], ["颜射系列", 71], ["口交视频", 72], ["自慰系列", 73], ["教师学生", 74], ["大秀视频", 75], ["明星换脸", 76]]),
      this.categoryPart("视频三区", [["全部", 56], ["日韩精品", 57], ["欧美精品", 58], ["动漫精品", 59], ["自拍偷拍", 60], ["伦理影片", 61], ["中文字幕", 62], ["人妻系列", 63], ["制服诱惑", 64], ["强奸乱伦", 65], ["AV明星", 66], ["SM重味", 68], ["AV解说", 78]]),
      this.categoryPart("视频四区", [["全部", 79], ["黑料网曝", 80], ["精品探花", 81], ["精品网红", 82], ["反差母狗", 83], ["颜值正义", 84], ["熟女少妇", 85], ["人兽乱交", 86], ["国产传媒", 89]]),
      this.categoryPart("视频五区", [["全部", 96], ["野战车震", 90], ["SM调教", 91], ["家庭乱伦", 92], ["百合女同", 93], ["学生空姐", 94], ["撸管必看", 95], ["偷情少妇", 97]]),
    ],
    enableRankingPage: false,
  };

  categoryComics = {
    load: async (category, param, options, page) => this.loadList(String(param || ""), page || 1),
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
      if (!item) throw "极品资源没有找到该视频";
      let chapters = this.extractEntries(item);
      let tags = [item.type_name, item.vod_area, item.vod_year]
        .filter((value) => value && String(value).trim());
      return new ComicDetails({
        title: String(item.vod_name || "极品资源"),
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
      if (!videoUrl) throw "极品资源当前集数没有可用的视频地址";
      return {
        images: [
            `venera-video:${JSON.stringify({ url: videoUrl, title: "极品资源", headers: this.playbackHeaders })}`,
        ],
      };
    },
  };
}
