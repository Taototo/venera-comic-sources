/** @type {import('../_venera_.js')} */
class Private360zyVideo extends ComicSource {
  type = "video";
  name = "360资源（私人）";
  key = "private_360zy_video";
  version = "1.0.0";
  minAppVersion = "1.0.0";
  url = "https://cdn.jsdelivr.net/gh/Taototo/venera-comic-sources@main/sources/private/360zy_video.js";

  _requestCache = new Map();
  _requestPending = new Map();

  settings = {
    api: {
      title: "JSON 接口",
      type: "select",
      options: [
        { value: "https://360zyzz.com/api.php/provide/vod/", text: "360标准线路" },
        { value: "https://360zyzz.com/api.php/provide/vod/from/360m3u8/at/json/", text: "360 m3u8线路" },
      ],
      default: "https://360zyzz.com/api.php/provide/vod/",
    },
  };

  get apiUrl() {
    return String(this.loadSetting("api") || this.settings.api.default)
      .trim()
      .replace(/[?&]+$/, "");
  }

  get headers() {
    return {
      "User-Agent": "Mozilla/5.0 (Linux; Android 12; K) AppleWebKit/537.36 Chrome/120.0.0.0 Mobile Safari/537.36",
      Accept: "application/json,text/plain,*/*",
      Referer: "https://360zyzz.com/",
    };
  }

  requestUrl(params) {
    let query = Object.keys(params)
      .map((key) => `${key}=${encodeURIComponent(params[key])}`)
      .join("&");
    return `${this.apiUrl}${this.apiUrl.indexOf("?") >= 0 ? "&" : "?"}${query}`;
  }

  async request(params) {
    let url = this.requestUrl(params);
    let cached = this._requestCache.get(url);
    if (cached && Date.now() - cached.time < 5000) return cached.data;
    let pending = this._requestPending.get(url);
    if (pending) return pending;
    let task = (async () => {
      let res = await Network.get(url, this.headers);
      if (res.status !== 200) throw `360资源接口状态异常: ${res.status}`;
      let text = String(res.body || "").trim();
      if (!text || text[0] !== "{") throw "360资源返回了无法解析的数据";
      text = text.replace(/("vod_id"\s*:\s*)(\d+)/g, '$1"$2"');
      let data;
      try { data = JSON.parse(text); } catch (_) { throw "360资源返回了无效 JSON"; }
      if (data.code !== undefined && Number(data.code) !== 1) throw data.msg || "360资源接口返回错误";
      this._requestCache.set(url, { time: Date.now(), data: data });
      return data;
    })();
    this._requestPending.set(url, task);
    try { return await task; } finally { this._requestPending.delete(url); }
  }

  clean(value) {
    return String(value || "").replace(/\\\//g, "/").replace(/\\u0026/gi, "&").replace(/\\u003d/gi, "=").trim();
  }

  extractStream(value) {
    let text = this.clean(value);
    let match = text.match(/https?:\/\/[^"'<>\\\s]+?\.(?:m3u8|mp4)(?:\?[^"'<>\\\s]*)?/i);
    return match ? match[0].replace(/[),;]+$/, "") : "";
  }

  toComic(item) {
    if (!item || item.vod_id === undefined || !item.vod_name) return null;
    let id = String(item.vod_id);
    let subtitle = [item.type_name, item.vod_year, item.vod_remarks].filter((v) => v && String(v).trim()).join(" · ");
    return new Comic({
      id: id,
      title: String(item.vod_name),
      subTitle: subtitle,
      cover: this.clean(item.vod_pic || item.vod_pic_thumb || item.vod_pic_slide),
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

  extractEntries(item) {
    let chapters = new Map();
    let groups = String(item && item.vod_play_url || "").split("$$$");
    let names = String(item && item.vod_play_from || "").split("$$$");
    let hasDirect = groups.some((group) => /\.(?:m3u8|mp4)(?:[?#]|\b)/i.test(group));
    for (let i = 0; i < groups.length; i++) {
      let group = groups[i];
      if (hasDirect && !/\.(?:m3u8|mp4)(?:[?#]|\b)/i.test(group)) continue;
      let route = names[i] ? names[i].trim() : "";
      for (let entry of group.split("#")) {
        let value = this.clean(entry).trim();
        if (!value) continue;
        let separator = value.indexOf("$");
        let label = separator >= 0 ? value.substring(0, separator).trim() : "播放";
        let raw = separator >= 0 ? value.substring(separator + 1).trim() : value;
        let url = this.extractStream(raw) || (/^https?:\/\//i.test(raw) ? raw : "");
        if (!url) continue;
        if (route && names.length > 1) label = `${route} · ${label || "播放"}`;
        chapters.set(url, label || "播放");
      }
    }
    return chapters;
  }

  categoryPart(name, entries) {
    return { name: name, type: "fixed", categories: entries.map((e) => e[0]), itemType: "category", categoryParams: entries.map((e) => String(e[1])) };
  }

  explore = [{
    title: "360资源",
    type: "multiPartPage",
    load: async () => {
      let sections = [["最新更新", ""], ["电影", "1"], ["连续剧", "2"], ["综艺", "3"], ["动漫", "4"], ["短剧", "46"]];
      let result = await Promise.all(sections.map(async (section) => {
        try { let page = await this.loadList(section[1], 1); return page.comics.length ? { title: section[0], comics: page.comics } : null; } catch (_) { return null; }
      }));
      return result.filter((v) => v != null);
    },
  }];

  category = {
    title: "360资源",
    parts: [
      this.categoryPart("主要分类", [["最新更新", ""], ["电影", 1], ["连续剧", 2], ["综艺", 3], ["动漫", 4], ["伦理片", 5], ["体育", 17], ["短剧", 46]]),
      this.categoryPart("电影类型", [["动作片", 6], ["喜剧片", 7], ["爱情片", 8], ["科幻片", 9], ["恐怖片", 10], ["剧情片", 11], ["战争片", 12], ["纪录片", 27]]),
      this.categoryPart("剧集与动漫", [["国产剧", 13], ["香港剧", 14], ["韩国剧", 15], ["欧美剧", 16], ["国产动漫", 38], ["欧美动漫", 39], ["日韩动漫", 40]]),
      this.categoryPart("短剧", [["现代都市", 47], ["脑洞悬疑", 48], ["年代穿越", 49], ["古装仙侠", 50], ["反转爽剧", 51], ["女频恋爱", 52], ["成长逆袭", 53]]),
    ],
    enableRankingPage: false,
  };

  categoryComics = { load: async (category, param, options, page) => this.loadList(String(param || ""), page || 1), optionList: [] };
  search = { load: async (keyword, options, page) => { let value = String(keyword || "").trim(); return value ? this.loadList("", page || 1, value) : { comics: [], maxPage: 1 }; }, optionList: [] };

  comic = {
    onThumbnailLoad: (url) => ({ headers: this.headers }),
    loadInfo: async (id) => {
      let data = await this.request({ ac: "detail", ids: String(id) });
      let item = Array.isArray(data.list) ? data.list[0] : null;
      if (!item) throw "360资源没有找到该视频";
      let chapters = this.extractEntries(item);
      let tags = [item.type_name, item.vod_area, item.vod_year].filter((v) => v && String(v).trim());
      return new ComicDetails({ title: String(item.vod_name || "360资源"), subTitle: String(item.vod_remarks || ""), cover: this.clean(item.vod_pic || item.vod_pic_thumb || item.vod_pic_slide), description: String(item.vod_content || item.vod_blurb || ""), tags: { 类型: tags }, chapters: chapters, url: this.requestUrl({ ac: "detail", ids: String(id) }), maxPage: chapters.size });
    },
    loadEp: async (comicId, epId) => {
      let candidate = String(epId || "");
      let videoUrl = this.extractStream(candidate);
      if (!videoUrl && /^https?:\/\//i.test(candidate)) {
        let res = await Network.get(candidate, this.headers);
        if (res.status === 200) videoUrl = this.extractStream(res.body);
      }
      if (!videoUrl) throw "360资源当前集数没有可用的视频地址";
      return { images: [`venera-video:${JSON.stringify({ url: videoUrl, title: "360资源", headers: this.headers })}`] };
    },
  };
}
