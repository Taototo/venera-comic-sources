/** @type {import('../_venera_.js')} */
class PrivateYuanlibVideo extends ComicSource {
  type = "video";
  name = "源力资源（私人）";
  key = "private_yuanlib_video";
  version = "1.3.0";
  minAppVersion = "1.0.0";
  url = "https://cdn.jsdelivr.net/gh/Taototo/venera-comic-sources@main/sources/private/yuanlib_video.js";

  _requestCache = new Map();
  _requestPending = new Map();

  settings = {
    api: {
      title: "JSON 接口",
      type: "input",
      default: "https://yuanlib.com/api.php/provide/vod/",
    },
    playbackDomain: {
      title: "播放线路",
      type: "select",
      options: [
        { value: "https://yuanlib.com", text: "yuanlib.com（默认）" },
        { value: "https://svip.yuanlib.com", text: "svip.yuanlib.com（备用）" },
      ],
      default: "https://yuanlib.com",
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
      Referer: "https://yuanlib.com/",
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
      if (res.status !== 200) throw `源力接口状态异常: ${res.status}`;
      let text = String(res.body || "").trim();
      if (!text || text[0] !== "{") throw "源力返回了无法解析的数据";
      text = text.replace(/("vod_id"\s*:\s*)(\d+)/g, '$1"$2"');
      let data;
      try {
        data = JSON.parse(text);
      } catch (_) {
        throw "源力返回了无效 JSON";
      }
      if (data.code !== undefined && Number(data.code) !== 1) {
        throw data.msg || "源力接口返回错误";
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

  // ==== 改动 1：优先提取 mp4，没有才退回 m3u8 ====
  extractStream(value) {
    let text = this.clean(value);
    let mp4 = text.match(/https?:\/\/[^"'<>\\\s]+?\.mp4(?:\?[^"'<>\\\s]*)?/i);
    if (mp4) return mp4[0].replace(/[),;]+$/, "");
    let m3u8 = text.match(/https?:\/\/[^"'<>\\\s]+?\.m3u8(?:\?[^"'<>\\\s]*)?/i);
    return m3u8 ? m3u8[0].replace(/[),;]+$/, "") : "";
  }

  normalizeStreamUrl(value) {
    let url = this.extractStream(value);
    if (!url) return url;
    return url.replace(
      /^https?:\/\/svip\.yuanlib\.com/i,
      this.playbackDomain
    );
  }

  // ==== 改动 2：m3u8 主列表解析出固定码率子列表 ====
  async resolveM3U8(url) {
    if (!/\.m3u8/i.test(url)) return url;
    try {
      let res = await Network.get(url, this.headers);
      if (res.status !== 200) return url;
      let text = String(res.body || "");
      if (text.indexOf("#EXT-X-STREAM-INF") < 0) return url;
      let lines = text.split("\n");
      for (let i = 0; i < lines.length; i++) {
        if (lines[i].startsWith("#EXT-X-STREAM-INF")) {
          let next = (lines[i + 1] || "").trim();
          if (next && next[0] !== "#") {
            if (/^https?:\/\//i.test(next)) return next;
            try {
              return new URL(next, url).toString();
            } catch (_) {
              return url;
            }
          }
        }
      }
      return url;
    } catch (_) {
      return url;
    }
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
      title: "源力资源",
      type: "multiPartPage",
      load: async () => {
        let sections = [
          ["最新更新", ""],
          ["国产专题", "1"],
          ["日韩专题", "2"],
          ["真实乱伦", "3"],
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
    title: "源力资源",
    parts: [
      this.categoryPart("国产专题", [["全部", 1], ["网友自拍", 9], ["酒店探花", 10], ["野战车震", 11], ["反差母狗", 12], ["偷情少妇", 13], ["嫩妹空姐", 14], ["福利姬", 15], ["人气主播", 16]]),
      this.categoryPart("日韩专题", [["全部", 2], ["有码字幕", 17], ["JAV无码中字", 18], ["JAV自拍", 20], ["JAV无码", 21], ["AV解说", 45]]),
      this.categoryPart("真实乱伦", [["全部", 3], ["兄妹姐弟", 22], ["父女乱伦", 23], ["母子乱伦", 24], ["岳父岳母", 25], ["叔嫂乱伦", 26], ["公媳乱伦", 27], ["姐夫小姨", 28], ["家庭乱伦", 29], ["乱伦原创", 30]]),
      this.categoryPart("欧美", [["全部", 4], ["欧美大片", 31], ["黑人专区", 32], ["留学生", 33]]),
      this.categoryPart("伦理三级", [["全部", 5], ["港台三级", 34], ["日韩三级", 35], ["欧美三级", 36]]),
      this.categoryPart("成人动漫", [["全部", 6], ["次元动漫", 42], ["3D动漫", 43]]),
      this.categoryPart("另类口味", [["全部", 7], ["男同GAY", 37], ["女同百合", 38], ["伪娘系列", 39], ["SM重口", 40], ["吃瓜黑料", 41], ["明星脸", 44]]),
      this.categoryPart("ai剧集", [["全部", 8]]),
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
      if (!item) throw "源力没有找到该视频";
      let chapters = this.extractEntries(item);
      let tags = [item.type_name, item.vod_area, item.vod_year]
        .filter((value) => value && String(value).trim());
      return new ComicDetails({
        title: String(item.vod_name || "源力资源"),
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
      if (!videoUrl) throw "源力当前集数没有可用的视频地址";

      videoUrl = await this.resolveM3U8(videoUrl);

      return {
        images: [
          `venera-video:${JSON.stringify({
            url: videoUrl,
            title: "源力资源",
            headers: this.headers,
          })}`,
        ],
      };
    },
  };
}
